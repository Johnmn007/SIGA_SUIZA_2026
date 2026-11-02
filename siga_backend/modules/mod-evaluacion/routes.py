from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import List

from database import get_db, OutboxEvent
from models import RegistroEvaluacion
from schemas import RegistroEvaluacionCreate, RegistroEvaluacionResponse, RegistroEvaluacionUpdate

router = APIRouter()

def _calcular_promedio(c1, c2, c3):
    notas = [n for n in (c1, c2, c3) if n is not None]
    if not notas:
        return None
    return round(sum(notas) / len(notas))

def _aplicar_notas(db_obj, nota_final_solicitada=None):
    """Calcula nota_final y estado del registro.

    Si existen notas por capacidad (c1/c2/c3) se recalcula el promedio.
    En caso contrario se conserva la nota final enviada por el docente
    (flujo actual del Panel Docente: ingreso directo del Promedio Final).
    """
    notas = _calcular_promedio(db_obj.nota_c1, db_obj.nota_c2, db_obj.nota_c3)
    db_obj.nota_final = notas if notas is not None else nota_final_solicitada
    db_obj.estado = _determinar_estado(db_obj.nota_final)

def _determinar_estado(promedio):
    if promedio is None:
        return "cursando"
    return "aprobado" if promedio >= 13 else "desaprobado"

@router.post("/registros", response_model=RegistroEvaluacionResponse, status_code=status.HTTP_201_CREATED)
async def crear_registro(data: RegistroEvaluacionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.matricula_detalle_id == data.matricula_detalle_id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El registro de evaluación ya existe para esta matrícula")
    
    db_obj = RegistroEvaluacion(**data.model_dump())
    _aplicar_notas(db_obj, nota_final_solicitada=data.nota_final)
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/registros/unidad/{unidad_id}/periodo/{periodo_id}", response_model=List[RegistroEvaluacionResponse])
async def listar_registros_por_unidad(unidad_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RegistroEvaluacion)
        .where(RegistroEvaluacion.unidad_didactica_id == unidad_id)
        .where(RegistroEvaluacion.periodo_id == periodo_id)
    )
    return result.scalars().all()

@router.get("/resumen/periodo/{periodo_id}")
async def resumen_avance_notas(periodo_id: int, db: AsyncSession = Depends(get_db)):
    """Avance real de registro de notas por unidad didáctica (para supervisión del coordinador)."""
    result = await db.execute(
        select(
            RegistroEvaluacion.unidad_didactica_id,
            func.count(RegistroEvaluacion.id),
            func.count(RegistroEvaluacion.nota_final),
        )
        .where(RegistroEvaluacion.periodo_id == periodo_id)
        .group_by(RegistroEvaluacion.unidad_didactica_id)
    )
    return [
        {
            "unidad_didactica_id": unidad_id,
            "total": total,
            "calificados": calificados,
            "porcentaje": round(calificados * 100 / total) if total else 0,
        }
        for unidad_id, total, calificados in result.all()
    ]

@router.put("/registros/{registro_id}", response_model=RegistroEvaluacionResponse)
async def actualizar_notas(registro_id: int, data: RegistroEvaluacionUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.id == registro_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Registro de evaluación no encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_obj, key, value)
        
    _aplicar_notas(db_obj, nota_final_solicitada=update_data.get("nota_final", db_obj.nota_final))
    
    event = OutboxEvent(
        event_type="evaluacion.nota.actualizada",
        payload={
            "registro_id": db_obj.id,
            "matricula_detalle_id": db_obj.matricula_detalle_id,
            "estudiante_id": db_obj.estudiante_id,
            "nota_final": db_obj.nota_final,
            "estado": db_obj.estado,
            "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
        }
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.post("/registros/sync-matricula")
async def sincronizar_matriculas(payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    matricula_id = payload.get("matricula_id")
    estudiante_id = payload.get("estudiante_id")
    detalles = payload.get("detalles", [])
    periodo_id = payload.get("periodo_id")
    
    for det in detalles:
        result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.matricula_detalle_id == det["id"]))
        if not result.scalar_one_or_none():
            db_obj = RegistroEvaluacion(
                matricula_detalle_id=det["id"],
                estudiante_id=estudiante_id,
                unidad_didactica_id=det["unidad_didactica_id"],
                periodo_id=periodo_id
            )
            db.add(db_obj)
            
    await db.commit()
    return {"message": "Sincronización completada"}

@router.post("/registros/batch")
async def guardar_registros_batch(items: List[dict], request: Request, db: AsyncSession = Depends(get_db)):
    """Guarda o actualiza múltiples registros de evaluación en una sola transacción."""
    actualizados = []
    for item in items:
        registro_id = item.get("id") or item.get("registro_id")
        db_obj = None
        if registro_id:
            result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.id == registro_id))
            db_obj = result.scalar_one_or_none()
        
        if not db_obj and item.get("matricula_detalle_id"):
            result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.matricula_detalle_id == item["matricula_detalle_id"]))
            db_obj = result.scalar_one_or_none()

        if not db_obj and item.get("matricula_detalle_id"):
            db_obj = RegistroEvaluacion(
                matricula_detalle_id=item["matricula_detalle_id"],
                estudiante_id=item["estudiante_id"],
                unidad_didactica_id=item["unidad_didactica_id"],
                periodo_id=item["periodo_id"]
            )
            db.add(db_obj)

        if db_obj:
            if "nota_c1" in item:
                db_obj.nota_c1 = item["nota_c1"] if item["nota_c1"] != "" and item["nota_c1"] is not None else None
            if "nota_c2" in item:
                db_obj.nota_c2 = item["nota_c2"] if item["nota_c2"] != "" and item["nota_c2"] is not None else None
            if "nota_c3" in item:
                db_obj.nota_c3 = item["nota_c3"] if item["nota_c3"] != "" and item["nota_c3"] is not None else None
            
            nota_final_val = item.get("nota_final")
            if nota_final_val == "":
                nota_final_val = None
            _aplicar_notas(db_obj, nota_final_solicitada=nota_final_val)
            actualizados.append(db_obj)

    await db.commit()
    for obj in actualizados:
        await db.refresh(obj)
    return [RegistroEvaluacionResponse.model_validate(obj) for obj in actualizados]

@router.post("/seccion/{unidad_id}/periodo/{periodo_id}/sincronizar")
async def sincronizar_nomina_seccion(unidad_id: int, periodo_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Sincroniza y matricula a los estudiantes activos del programa EXCLUSIVAMENTE del ciclo
    que corresponde a esta unidad didáctica. Previene estrictamente que estudiantes de ciclos
    inferiores (ej. ingresantes de Ciclo 1) sean asignados a cursos de ciclos superiores.
    """
    query_ud = text("""
        SELECT u.id, u.creditos, m.programa_id, m.periodo as ciclo, u.nombre as unidad_nombre
        FROM programa_unidades u
        JOIN programa_modulos m ON u.programa_modulo_id = m.id
        WHERE u.id = :uid
    """)
    res_ud = await db.execute(query_ud, {"uid": unidad_id})
    row_ud = res_ud.fetchone()
    if not row_ud:
        raise HTTPException(status_code=404, detail="Unidad didáctica no encontrada")
    
    prog_id = row_ud[2]
    creds = row_ud[1] or 2
    ciclo = row_ud[3] or 1
    unidad_nombre = row_ud[4]
    
    # Buscar estudiantes que pertenezcan estrictamente al programa Y al ciclo de la unidad
    res_est = await db.execute(
        text("SELECT id, dni, nombres, apellidos FROM estudiantes WHERE programa_id = :pid AND ciclo_actual = :ciclo ORDER BY apellidos, nombres"),
        {"pid": prog_id, "ciclo": ciclo}
    )
    estudiantes = res_est.fetchall()
    
    if not estudiantes:
        return {
            "status": "warning", 
            "message": f"No hay estudiantes registrados en el Ciclo {ciclo} para el curso '{unidad_nombre}'.",
            "count": 0
        }
        
    for est in estudiantes:
        est_id = est[0]
        # Verificar o crear matrícula del estudiante en el periodo para su ciclo correspondiente
        res_mat = await db.execute(
            text("SELECT id FROM matriculas WHERE estudiante_id = :eid AND periodo_id = :pid"),
            {"eid": est_id, "pid": periodo_id}
        )
        row_mat = res_mat.fetchone()
        if not row_mat:
            res_ins_mat = await db.execute(text("""
                INSERT INTO matriculas (estudiante_id, programa_id, periodo_id, estado_matricula, ciclo, tipo_ingreso, casuistica, created_at)
                VALUES (:eid, :prid, :pid, 'confirmada', :ciclo, 'regular', 'regular', NOW())
                RETURNING id
            """), {"eid": est_id, "prid": prog_id, "pid": periodo_id, "ciclo": ciclo})
            mat_id = res_ins_mat.fetchone()[0]
        else:
            mat_id = row_mat[0]
            
        # Verificar detalle de matrícula para esta unidad
        res_det = await db.execute(
            text("SELECT id FROM matricula_detalles WHERE matricula_id = :mid AND unidad_didactica_id = :uid"),
            {"mid": mat_id, "uid": unidad_id}
        )
        row_det = res_det.fetchone()
        if not row_det:
            res_ins_det = await db.execute(text("""
                INSERT INTO matricula_detalles (matricula_id, unidad_didactica_id, estado_curso, creditos, created_at)
                VALUES (:mid, :uid, 'cursando', :creds, NOW())
                RETURNING id
            """), {"mid": mat_id, "uid": unidad_id, "creds": creds})
            det_id = res_ins_det.fetchone()[0]
        else:
            det_id = row_det[0]
            
        # Verificar registro de evaluación
        res_reg = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.matricula_detalle_id == det_id))
        if not res_reg.scalar_one_or_none():
            db_reg = RegistroEvaluacion(
                matricula_detalle_id=det_id,
                estudiante_id=est_id,
                unidad_didactica_id=unidad_id,
                periodo_id=periodo_id,
                estado="cursando"
            )
            db.add(db_reg)
            
    await db.commit()
    return {"status": "ok", "message": f"Sincronizados {len(estudiantes)} estudiantes del Ciclo {ciclo} para {unidad_nombre}", "count": len(estudiantes)}


