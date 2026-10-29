from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import List, Optional
from datetime import datetime, date
from zoneinfo import ZoneInfo

from database import get_db, OutboxEvent
from models import RegistroEvaluacion
from schemas import (
    RegistroEvaluacionCreate, RegistroEvaluacionResponse, RegistroEvaluacionUpdate,
    EstadoActaUnidadResponse, ResumenActasProgramaResponse, CargaActaItem, UnidadSinCargaItem,
    FechaLimiteRequest, ReabrirActaRequest
)

router = APIRouter()

def get_hoy_lima() -> date:
    """Retorna la fecha actual en la zona horaria institucional America/Lima."""
    return datetime.now(ZoneInfo("America/Lima")).date()

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

ESTADOS_PERIODO_CALIFICABLES = {"en_curso", "matricula_abierta"}

async def _validar_cierre_y_fecha_limite(db: AsyncSession, unidad_didactica_id: int, periodo_id: int, codigo_periodo: str):
    """
    Busca la fila de carga_lectiva por (unidad_didactica_id, periodo_id):
    - Si no hay fila: solo rige la regla del periodo (no inventar filas).
    - Si hay filas:
      * El acta está cerrada solo si TODAS están cerradas.
      * La fecha límite efectiva es la más tardía (NULL significa sin límite).
      * Si hay más de una fila por par (unidad, periodo), documenta la limitación de secciones.
      * Acta cerrada: 409 con mensaje en español ("El acta de la unidad X del periodo Y está cerrada. Solicite su reapertura al coordinador.").
      * Fecha vencida: 409 ("El plazo para ingresar notas venció el DD/MM/AAAA. Solicite una ampliación al coordinador.").
    """
    carga_res = await db.execute(
        text("SELECT acta_cerrada, fecha_limite_notas FROM carga_lectiva WHERE unidad_didactica_id = :u_id AND periodo_id = :p_id"),
        {"u_id": unidad_didactica_id, "p_id": periodo_id}
    )
    cargas = carga_res.fetchall()
    if not cargas:
        return

    # Si hay filas: el acta está cerrada solo si TODAS están cerradas
    todas_cerradas = all(bool(c[0]) for c in cargas)
    if todas_cerradas:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El acta de la unidad {unidad_didactica_id} del periodo {codigo_periodo} está cerrada. Solicite su reapertura al coordinador."
        )

    # Fecha límite: la fecha más tardía entre las cargas abiertas; si alguna tiene NULL, no hay límite
    cargas_abiertas = [c for c in cargas if not c[0]]
    if any(c[1] is None for c in cargas_abiertas):
        return

    fechas = [c[1] for c in cargas_abiertas if c[1] is not None]
    if fechas:
        fecha_efectiva = max(fechas)
        hoy = get_hoy_lima()
        if hoy > fecha_efectiva:
            fecha_str = fecha_efectiva.strftime("%d/%m/%Y")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El plazo para ingresar notas venció el {fecha_str}. Solicite una ampliación al coordinador."
            )

@router.post("/registros", response_model=RegistroEvaluacionResponse, status_code=status.HTTP_201_CREATED)
async def crear_registro(data: RegistroEvaluacionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    # 1. Validar que el periodo académico permita calificación (BUG-D05)
    per_res = await db.execute(
        text("SELECT codigo, estado FROM periodos_academicos WHERE id = :p_id"),
        {"p_id": data.periodo_id}
    )
    per_row = per_res.fetchone()
    codigo_periodo = per_row[0] if per_row else str(data.periodo_id)
    estado_periodo = per_row[1] if per_row else None

    if estado_periodo not in ESTADOS_PERIODO_CALIFICABLES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El periodo académico {codigo_periodo} se encuentra en estado '{estado_periodo}'. No se permite registrar calificaciones."
        )

    # 1.b Validar reglas de cierre de acta y fecha límite (PASO 2)
    await _validar_cierre_y_fecha_limite(db, data.unidad_didactica_id, data.periodo_id, codigo_periodo)

    # 2. Validar que la matrícula exista y corresponda a la unidad y periodo (BUG-D04)
    mat_res = await db.execute(
        text("""
            SELECT md.id 
            FROM matricula_detalles md
            JOIN matriculas m ON md.matricula_id = m.id
            WHERE md.id = :det_id 
              AND md.unidad_didactica_id = :u_id
              AND m.estudiante_id = :est_id
              AND m.periodo_id = :per_id
              AND m.estado_matricula != 'anulada'
        """),
        {
            "det_id": data.matricula_detalle_id,
            "u_id": data.unidad_didactica_id,
            "est_id": data.estudiante_id,
            "per_id": data.periodo_id
        }
    )
    if not mat_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una matrícula activa válida que corresponda al estudiante, unidad didáctica y periodo indicados."
        )

    # 3. Validar no duplicidad
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
    
    # 1. Validar que el periodo académico permita calificación (BUG-D05)
    per_res = await db.execute(
        text("SELECT codigo, estado FROM periodos_academicos WHERE id = :p_id"),
        {"p_id": db_obj.periodo_id}
    )
    per_row = per_res.fetchone()
    codigo_periodo = per_row[0] if per_row else str(db_obj.periodo_id)
    estado_periodo = per_row[1] if per_row else None

    if estado_periodo not in ESTADOS_PERIODO_CALIFICABLES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El periodo académico {codigo_periodo} se encuentra en estado '{estado_periodo}'. No se permite modificar calificaciones."
        )

    # 1.b Validar que el registro no esté consolidado/cerrado (BUG-D01)
    if db_obj.estado in ["cerrado", "consolidado"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El registro de evaluación se encuentra en estado '{db_obj.estado}'. No se permite modificar calificaciones."
        )

    # 1.c Validar reglas de cierre de acta y fecha límite en carga_lectiva (PASO 2)
    await _validar_cierre_y_fecha_limite(db, db_obj.unidad_didactica_id, db_obj.periodo_id, codigo_periodo)
    
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

# ==============================================================================
# ENDPOINTS DE GESTIÓN Y CIERRE DE ACTAS DE EVALUACIÓN (PASO 3)
# ==============================================================================

@router.get("/actas/unidad/{unidad_id}/periodo/{periodo_id}", response_model=EstadoActaUnidadResponse)
async def consultar_estado_acta_unidad(unidad_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    """Consulta el estado del acta y fecha límite de una unidad en un periodo (para el panel docente)."""
    # 1. Obtener estado del periodo
    per_res = await db.execute(
        text("SELECT codigo, estado FROM periodos_academicos WHERE id = :p_id"),
        {"p_id": periodo_id}
    )
    per_row = per_res.fetchone()
    codigo_periodo = per_row[0] if per_row else str(periodo_id)
    estado_periodo = per_row[1] if per_row else None

    periodo_bloqueado = estado_periodo not in ESTADOS_PERIODO_CALIFICABLES

    # 2. Consultar carga_lectiva
    cargas_res = await db.execute(
        text("SELECT id, acta_cerrada, fecha_limite_notas FROM carga_lectiva WHERE unidad_didactica_id = :u_id AND periodo_id = :p_id"),
        {"u_id": unidad_id, "p_id": periodo_id}
    )
    cargas = cargas_res.fetchall()

    if not cargas:
        # Sin fila en carga_lectiva: solo rige la regla del periodo
        if periodo_bloqueado:
            return EstadoActaUnidadResponse(
                tiene_carga=False,
                acta_cerrada=False,
                fecha_limite_notas=None,
                editable=False,
                motivo_bloqueo=f"El periodo académico {codigo_periodo} se encuentra en estado '{estado_periodo}'. Calificaciones bloqueadas."
            )
        return EstadoActaUnidadResponse(
            tiene_carga=False,
            acta_cerrada=False,
            fecha_limite_notas=None,
            editable=True,
            motivo_bloqueo=None
        )

    # Con filas en carga_lectiva
    acta_cerrada = all(bool(c[1]) for c in cargas)
    cargas_abiertas = [c for c in cargas if not c[1]]
    if any(c[2] is None for c in cargas_abiertas):
        fecha_limite_efectiva = None
    elif cargas_abiertas:
        fecha_limite_efectiva = max(c[2] for c in cargas_abiertas if c[2] is not None)
    else:
        fechas_todas = [c[2] for c in cargas if c[2] is not None]
        fecha_limite_efectiva = max(fechas_todas) if fechas_todas else None

    if periodo_bloqueado:
        editable = False
        motivo_bloqueo = f"El periodo académico {codigo_periodo} se encuentra en estado '{estado_periodo}'. Calificaciones bloqueadas."
    elif acta_cerrada:
        editable = False
        motivo_bloqueo = f"El acta de la unidad {unidad_id} del periodo {codigo_periodo} está cerrada. Solicite su reapertura al coordinador."
    elif fecha_limite_efectiva is not None and get_hoy_lima() > fecha_limite_efectiva:
        editable = False
        motivo_bloqueo = f"El plazo para ingresar notas venció el {fecha_limite_efectiva.strftime('%d/%m/%Y')}. Solicite una ampliación al coordinador."
    else:
        editable = True
        motivo_bloqueo = None

    return EstadoActaUnidadResponse(
        tiene_carga=True,
        acta_cerrada=acta_cerrada,
        fecha_limite_notas=fecha_limite_efectiva,
        editable=editable,
        motivo_bloqueo=motivo_bloqueo
    )

@router.get("/actas/periodo/{periodo_id}/programa/{programa_id}", response_model=ResumenActasProgramaResponse)
async def consultar_actas_programa_periodo(periodo_id: int, programa_id: int, db: AsyncSession = Depends(get_db)):
    """Resumen de actas para el coordinador: lista cargas lectivas y unidades sin carga."""
    # 1. Cargas lectivas del programa y periodo
    cargas_res = await db.execute(
        text("""
            SELECT cl.id, cl.unidad_didactica_id, cl.docente_id, cl.fecha_limite_notas, cl.acta_cerrada,
                   COALESCE(up.nombre, pu.nombre, 'Unidad ' || cl.unidad_didactica_id) AS unidad_nombre
            FROM carga_lectiva cl
            LEFT JOIN unidades_plan up ON up.id = cl.unidad_didactica_id
            LEFT JOIN programa_unidades pu ON pu.id = cl.unidad_didactica_id
            WHERE cl.periodo_id = :p_id AND cl.programa_id = :prog_id
            ORDER BY cl.id;
        """),
        {"p_id": periodo_id, "prog_id": programa_id}
    )
    cargas_rows = cargas_res.fetchall()

    cargas_items = []
    for row in cargas_rows:
        carga_id, u_id, docente_id, f_limite, a_cerrada, u_nombre = row
        # Calcular estadísticas de matrículas activas
        stats_res = await db.execute(
            text("""
                SELECT 
                    count(md.id) AS total_matriculas,
                    count(er.nota_final) AS con_nota_final,
                    count(md.id) - count(er.nota_final) AS faltantes
                FROM matricula_detalles md
                JOIN matriculas m ON m.id = md.matricula_id
                LEFT JOIN evaluacion_registros er ON er.matricula_detalle_id = md.id
                WHERE md.unidad_didactica_id = :u_id 
                  AND m.periodo_id = :p_id 
                  AND m.programa_id = :prog_id
                  AND m.estado_matricula = 'confirmada';
            """),
            {"u_id": u_id, "p_id": periodo_id, "prog_id": programa_id}
        )
        s_row = stats_res.fetchone()
        tot = s_row[0] if s_row else 0
        con_n = s_row[1] if s_row else 0
        falt = s_row[2] if s_row else 0

        cargas_items.append(CargaActaItem(
            carga_id=carga_id,
            unidad_didactica_id=u_id,
            unidad=u_nombre,
            docente_id=docente_id,
            fecha_limite_notas=f_limite,
            acta_cerrada=bool(a_cerrada),
            total_matriculas=tot,
            con_nota_final=con_n,
            faltantes=falt
        ))

    # 2. Unidades con notas pero sin fila en carga_lectiva
    sin_carga_res = await db.execute(
        text("""
            SELECT er.unidad_didactica_id,
                   COALESCE(up.nombre, pu.nombre, 'Unidad ' || er.unidad_didactica_id) AS unidad_nombre,
                   count(md.id) AS total_matriculas,
                   count(er.nota_final) AS con_nota_final,
                   count(md.id) - count(er.nota_final) AS faltantes
            FROM evaluacion_registros er
            JOIN matricula_detalles md ON md.id = er.matricula_detalle_id
            JOIN matriculas m ON m.id = md.matricula_id
            LEFT JOIN unidades_plan up ON up.id = er.unidad_didactica_id
            LEFT JOIN programa_unidades pu ON pu.id = er.unidad_didactica_id
            LEFT JOIN carga_lectiva cl ON cl.unidad_didactica_id = er.unidad_didactica_id 
                                     AND cl.periodo_id = er.periodo_id 
                                     AND cl.programa_id = :prog_id
            WHERE er.periodo_id = :p_id 
              AND m.programa_id = :prog_id
              AND m.estado_matricula = 'confirmada'
              AND cl.id IS NULL
            GROUP BY er.unidad_didactica_id, up.nombre, pu.nombre
            ORDER BY er.unidad_didactica_id;
        """),
        {"p_id": periodo_id, "prog_id": programa_id}
    )
    sin_carga_rows = sin_carga_res.fetchall()
    sin_carga_items = [
        UnidadSinCargaItem(
            unidad_didactica_id=r[0],
            unidad=r[1],
            total_matriculas=r[2],
            con_nota_final=r[3],
            faltantes=r[4]
        )
        for r in sin_carga_rows
    ]

    return ResumenActasProgramaResponse(cargas=cargas_items, unidades_sin_carga=sin_carga_items)

@router.put("/actas/carga/{carga_id}/fecha-limite")
async def actualizar_fecha_limite_carga(carga_id: int, data: FechaLimiteRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Fija la fecha límite de ingreso de notas para una carga lectiva."""
    hoy = get_hoy_lima()
    if data.fecha_limite_notas < hoy:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha límite debe ser igual o posterior a la fecha actual."
        )

    carga_res = await db.execute(
        text("SELECT id, periodo_id, programa_id, unidad_didactica_id, acta_cerrada, fecha_limite_notas FROM carga_lectiva WHERE id = :id"),
        {"id": carga_id}
    )
    carga = carga_res.fetchone()
    if not carga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga lectiva no encontrada.")

    if carga[4]:  # acta_cerrada
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se puede modificar la fecha límite de un acta cerrada.")

    per_res = await db.execute(
        text("SELECT codigo, estado FROM periodos_academicos WHERE id = :p_id"),
        {"p_id": carga[1]}
    )
    per_row = per_res.fetchone()
    cod_per = per_row[0] if per_row else str(carga[1])
    est_per = per_row[1] if per_row else None
    if est_per == "cerrado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede modificar la fecha límite porque el periodo académico {cod_per} está cerrado."
        )

    valor_ant = carga[5]
    await db.execute(
        text("UPDATE carga_lectiva SET fecha_limite_notas = :f, updated_at = NOW() WHERE id = :id"),
        {"f": data.fecha_limite_notas, "id": carga_id}
    )

    user_id = request.headers.get("X-User-ID")
    req_id = request.headers.get("X-Request-ID", "unknown")

    event = OutboxEvent(
        event_type="evaluacion.acta.fecha_limite_actualizada",
        payload={
            "carga_id": carga_id,
            "unidad_didactica_id": carga[3],
            "periodo_id": carga[1],
            "valores_anteriores": {"fecha_limite_notas": str(valor_ant) if valor_ant else None},
            "valores_nuevos": {"fecha_limite_notas": str(data.fecha_limite_notas)},
            "motivo": "Actualización de fecha límite de acta",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {"request_id": req_id, "user_id": user_id}
        }
    )
    db.add(event)
    await db.commit()

    return {
        "message": "Fecha límite actualizada exitosamente",
        "carga_id": carga_id,
        "fecha_limite_notas": data.fecha_limite_notas
    }

@router.post("/actas/programa/{programa_id}/periodo/{periodo_id}/fecha-limite")
async def actualizar_fecha_limite_masiva(programa_id: int, periodo_id: int, data: FechaLimiteRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Fija la misma fecha límite a todas las cargas lectivas abiertas de un programa y periodo."""
    hoy = get_hoy_lima()
    if data.fecha_limite_notas < hoy:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha límite debe ser igual o posterior a la fecha actual."
        )

    per_res = await db.execute(
        text("SELECT codigo, estado FROM periodos_academicos WHERE id = :p_id"),
        {"p_id": periodo_id}
    )
    per_row = per_res.fetchone()
    cod_per = per_row[0] if per_row else str(periodo_id)
    est_per = per_row[1] if per_row else None
    if est_per == "cerrado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se pueden modificar fechas límite porque el periodo académico {cod_per} está cerrado."
        )

    cargas_res = await db.execute(
        text("SELECT id FROM carga_lectiva WHERE programa_id = :prog_id AND periodo_id = :p_id AND acta_cerrada = false"),
        {"prog_id": programa_id, "p_id": periodo_id}
    )
    cargas_ids = [r[0] for r in cargas_res.fetchall()]

    if cargas_ids:
        await db.execute(
            text("UPDATE carga_lectiva SET fecha_limite_notas = :f, updated_at = NOW() WHERE id = ANY(:ids)"),
            {"f": data.fecha_limite_notas, "ids": cargas_ids}
        )

    user_id = request.headers.get("X-User-ID")
    req_id = request.headers.get("X-Request-ID", "unknown")

    event = OutboxEvent(
        event_type="evaluacion.acta.fecha_limite_masiva",
        payload={
            "programa_id": programa_id,
            "periodo_id": periodo_id,
            "total_actualizadas": len(cargas_ids),
            "cargas_actualizadas": cargas_ids,
            "valores_anteriores": {},
            "valores_nuevos": {"fecha_limite_notas": str(data.fecha_limite_notas)},
            "motivo": "Actualización masiva de fechas límite por coordinación",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {"request_id": req_id, "user_id": user_id}
        }
    )
    db.add(event)
    await db.commit()

    return {
        "message": f"Se actualizaron {len(cargas_ids)} cargas lectivas.",
        "actualizadas": len(cargas_ids),
        "fecha_limite_notas": data.fecha_limite_notas
    }

@router.post("/actas/carga/{carga_id}/cerrar")
async def cerrar_acta_carga(carga_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Cierra el acta de una carga lectiva verificando que todas las matrículas activas tengan calificación final."""
    carga_res = await db.execute(
        text("SELECT id, periodo_id, programa_id, unidad_didactica_id, acta_cerrada FROM carga_lectiva WHERE id = :id"),
        {"id": carga_id}
    )
    carga = carga_res.fetchone()
    if not carga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga lectiva no encontrada.")

    if carga[4]:  # acta_cerrada
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El acta ya se encuentra cerrada.")

    per_res = await db.execute(
        text("SELECT codigo, estado FROM periodos_academicos WHERE id = :p_id"),
        {"p_id": carga[1]}
    )
    per_row = per_res.fetchone()
    cod_per = per_row[0] if per_row else str(carga[1])
    est_per = per_row[1] if per_row else None
    if est_per == "cerrado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede cerrar el acta porque el periodo académico {cod_per} está cerrado."
        )

    # Verificar que CADA matrícula activa tenga un registro de evaluación con nota_final no nula
    faltantes_res = await db.execute(
        text("""
            SELECT md.matricula_id, er.nota_final
            FROM matricula_detalles md
            JOIN matriculas m ON m.id = md.matricula_id
            LEFT JOIN evaluacion_registros er ON er.matricula_detalle_id = md.id
            WHERE md.unidad_didactica_id = :u_id 
              AND m.periodo_id = :p_id 
              AND m.programa_id = :prog_id
              AND m.estado_matricula = 'confirmada'
              AND (er.id IS NULL OR er.nota_final IS NULL);
        """),
        {"u_id": carga[3], "p_id": carga[1], "prog_id": carga[2]}
    )
    faltantes_rows = faltantes_res.fetchall()
    if faltantes_rows:
        faltantes_matricula_ids = sorted(list(set(r[0] for r in faltantes_rows)))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": f"No se puede cerrar el acta: faltan {len(faltantes_matricula_ids)} calificaciones finales por registrar.",
                "total_faltantes": len(faltantes_matricula_ids),
                "matricula_ids": faltantes_matricula_ids
            }
        )

    user_id_str = request.headers.get("X-User-ID")
    user_id_int = int(user_id_str) if user_id_str and user_id_str.isdigit() else None
    now_ts = datetime.utcnow()

    # Guardar acta cerrada en carga_lectiva
    await db.execute(
        text("""
            UPDATE carga_lectiva 
            SET acta_cerrada = true, 
                acta_cerrada_at = :now, 
                acta_cerrada_por = :u_id, 
                updated_at = NOW() 
            WHERE id = :id
        """),
        {"now": now_ts, "u_id": user_id_int, "id": carga_id}
    )

    # Consolidar/cerrar registros asociados
    await db.execute(
        text("""
            UPDATE evaluacion_registros 
            SET estado = 'cerrado', updated_at = NOW() 
            WHERE unidad_didactica_id = :u_id AND periodo_id = :p_id
        """),
        {"u_id": carga[3], "p_id": carga[1]}
    )

    req_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="evaluacion.acta.cerrada",
        payload={
            "carga_id": carga_id,
            "unidad_didactica_id": carga[3],
            "periodo_id": carga[1],
            "valores_anteriores": {"acta_cerrada": False},
            "valores_nuevos": {
                "acta_cerrada": True,
                "acta_cerrada_at": now_ts.isoformat(),
                "acta_cerrada_por": user_id_int
            },
            "motivo": "Cierre regular de acta de evaluación",
            "user_id": user_id_str,
            "timestamp": now_ts.isoformat(),
            "metadata": {"request_id": req_id, "user_id": user_id_str}
        }
    )
    db.add(event)
    await db.commit()

    return {
        "message": "Acta cerrada exitosamente",
        "carga_id": carga_id,
        "acta_cerrada": True,
        "acta_cerrada_at": now_ts,
        "acta_cerrada_por": user_id_int
    }

@router.post("/actas/carga/{carga_id}/reabrir")
async def reabrir_acta_carga(carga_id: int, data: ReabrirActaRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Reabre un acta cerrada exigiendo motivo justificatorio y nueva fecha límite."""
    if not data.motivo or len(data.motivo.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El motivo de reapertura es obligatorio y debe tener al menos 10 caracteres."
        )

    hoy = get_hoy_lima()
    if data.nueva_fecha_limite < hoy:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La nueva fecha límite debe ser igual o posterior a la fecha actual."
        )

    carga_res = await db.execute(
        text("SELECT id, periodo_id, programa_id, unidad_didactica_id, acta_cerrada, fecha_limite_notas, acta_cerrada_por FROM carga_lectiva WHERE id = :id"),
        {"id": carga_id}
    )
    carga = carga_res.fetchone()
    if not carga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga lectiva no encontrada.")

    if not carga[4]:  # no estaba cerrada
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El acta no se encuentra cerrada.")

    per_res = await db.execute(
        text("SELECT codigo, estado FROM periodos_academicos WHERE id = :p_id"),
        {"p_id": carga[1]}
    )
    per_row = per_res.fetchone()
    cod_per = per_row[0] if per_row else str(carga[1])
    est_per = per_row[1] if per_row else None
    if est_per == "cerrado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede reabrir el acta porque el periodo académico {cod_per} está cerrado."
        )

    # Actualizar carga_lectiva a abierta con nueva fecha
    await db.execute(
        text("""
            UPDATE carga_lectiva 
            SET acta_cerrada = false, 
                fecha_limite_notas = :f, 
                acta_cerrada_at = NULL, 
                acta_cerrada_por = NULL, 
                updated_at = NOW() 
            WHERE id = :id
        """),
        {"f": data.nueva_fecha_limite, "id": carga_id}
    )

    # Restablecer estado de los registros a su condición según nota_final
    await db.execute(
        text("""
            UPDATE evaluacion_registros 
            SET estado = CASE 
                WHEN nota_final >= 13 THEN 'aprobado' 
                WHEN nota_final IS NOT NULL THEN 'desaprobado' 
                ELSE 'cursando' 
            END,
            updated_at = NOW() 
            WHERE unidad_didactica_id = :u_id AND periodo_id = :p_id
        """),
        {"u_id": carga[3], "p_id": carga[1]}
    )

    user_id_str = request.headers.get("X-User-ID")
    req_id = request.headers.get("X-Request-ID", "unknown")
    now_ts = datetime.utcnow()

    event = OutboxEvent(
        event_type="evaluacion.acta.reabierta",
        payload={
            "carga_id": carga_id,
            "unidad_didactica_id": carga[3],
            "periodo_id": carga[1],
            "valores_anteriores": {
                "acta_cerrada": True,
                "fecha_limite_notas": str(carga[5]) if carga[5] else None,
                "acta_cerrada_por": carga[6]
            },
            "valores_nuevos": {
                "acta_cerrada": False,
                "fecha_limite_notas": str(data.nueva_fecha_limite),
                "acta_cerrada_por": None
            },
            "motivo": data.motivo.strip(),
            "user_id": user_id_str,
            "timestamp": now_ts.isoformat(),
            "metadata": {"request_id": req_id, "user_id": user_id_str}
        }
    )
    db.add(event)
    await db.commit()

    return {
        "message": "Acta reabierta exitosamente",
        "carga_id": carga_id,
        "acta_cerrada": False,
        "fecha_limite_notas": data.nueva_fecha_limite
    }
