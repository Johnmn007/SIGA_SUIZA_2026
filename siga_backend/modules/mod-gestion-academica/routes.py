from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from database import get_db, OutboxEvent
from models import Estudiante, Matricula, MatriculaDetalle
from schemas import EstudianteCreate, EstudianteResponse, EstudianteUpdate, MatriculaCreate, MatriculaResponse, IngestaMasivaRequest
from datetime import datetime
from typing import List, Optional
import uuid

router = APIRouter()

@router.post("/admision/ingesta", status_code=status.HTTP_202_ACCEPTED)
async def ingesta_admitidos(request: Request, data: IngestaMasivaRequest, db: AsyncSession = Depends(get_db)):
    """
    Endpoint para ingestar de forma masiva (PUSH) los admitidos desde la App Externa de Admisión.
    Crea los expedientes de estudiantes y dispara eventos para integrarlos al ecosistema (crear usuarios, matricular, etc).
    """
    estudiantes_creados = 0
    
    for admitido in data.admitidos:
        # 1. Capa Anticorrupción: Validar si ya existe
        existing = await db.execute(select(Estudiante).where(Estudiante.dni == admitido.dni))
        if existing.scalar_one_or_none():
            continue # Ya existe, saltamos
            
        # Generar código universitario estándar
        year = datetime.now().year
        codigo = f"{year}-{admitido.dni}"
        
        # 2. Crear Estudiante
        db_estudiante = Estudiante(
            codigo_estudiante=codigo,
            dni=admitido.dni,
            nombres=admitido.nombres,
            apellidos=admitido.apellidos,
            programa_id=admitido.programa_id,
            celular=admitido.celular,
            email_personal=admitido.email_personal,
            modalidad_admision=admitido.modalidad,
            metadata_admision=admitido.metadata_completa
        )
        db.add(db_estudiante)
        await db.flush() # para obtener el ID
        
        # 3. Disparar evento para matricular en Ciclo I automáticamente
        # y para que mod-usuarios le cree su cuenta
        event_payload = {
            "event_id": str(uuid.uuid4()),
            "event_type": "gestion_academica.admision.estudiante_ingresado",
            "source": "mod-gestion-academica",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "version": "1.0.0",
            "data": {
                "estudiante_id": db_estudiante.id,
                "dni": db_estudiante.dni,
                "nombres": db_estudiante.nombres,
                "apellidos": db_estudiante.apellidos,
                "programa_id": admitido.programa_id,
                "periodo_id": admitido.periodo_id,
                "proceso_admision_id": data.proceso_admision_id
            },
            "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
        }
        
        db.add(OutboxEvent(event_type=event_payload["event_type"], payload=event_payload))
        estudiantes_creados += 1
        
    await db.commit()
    return {"message": "Ingesta procesada", "estudiantes_creados": estudiantes_creados}

@router.post("/estudiantes/", response_model=EstudianteResponse, status_code=status.HTTP_201_CREATED)
async def crear_estudiante(request: Request, data: EstudianteCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Estudiante).where(
        or_(Estudiante.dni == data.dni, Estudiante.codigo_estudiante == data.codigo_estudiante)
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="DNI o Codigo ya existen")

    db_estudiante = Estudiante(**data.model_dump())
    db.add(db_estudiante)
    await db.flush()
    
    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "gestion_academica.estudiante.creado",
        "source": "mod-gestion-academica",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "data": {"id": db_estudiante.id, "dni": db_estudiante.dni, "nombre": f"{db_estudiante.nombres} {db_estudiante.apellidos}"},
        "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
    }
    
    db.add(OutboxEvent(event_type=event_payload["event_type"], payload=event_payload))
    await db.commit()
    await db.refresh(db_estudiante)
    return db_estudiante

@router.get("/estudiantes/")
async def obtener_estudiantes(programa_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    import traceback
    try:
        query = select(Estudiante).order_by(Estudiante.apellidos)
        if programa_id is not None:
            query = query.where(Estudiante.programa_id == programa_id)
        result = await db.execute(query)
        rows = result.scalars().all()
        print(f"[DEBUG] Estudiantes encontrados: {len(rows)}")
        return [{"id": r.id, "codigo_estudiante": r.codigo_estudiante, "dni": r.dni, "nombres": r.nombres, "apellidos": r.apellidos, "estado_academico": r.estado_academico, "programa_id": r.programa_id} for r in rows]
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[ERROR] obtener_estudiantes: {e}\n{tb}")
        return {"error": str(e), "type": type(e).__name__, "traceback": tb}

@router.put("/estudiantes/{estudiante_id}/pago_matricula", response_model=EstudianteResponse)
async def actualizar_pago_matricula(estudiante_id: int, request: Request, pagado: bool = True, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))
    estudiante = result.scalar_one_or_none()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        
    estudiante.pago_matricula = pagado
    await db.commit()
    await db.refresh(estudiante)
    return estudiante

@router.get("/estudiantes/{estudiante_id}", response_model=EstudianteResponse)
async def obtener_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))
    db_estudiante = result.scalar_one_or_none()
    if not db_estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return db_estudiante

@router.get("/estudiantes/{estudiante_id}/boletin")
async def obtener_boletin(estudiante_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text

    result_est = await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))
    estudiante = result_est.scalar_one_or_none()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    result_mat = await db.execute(
        select(Matricula).options(selectinload(Matricula.detalles))
        .where(Matricula.estudiante_id == estudiante_id)
        .where(Matricula.periodo_id == periodo_id)
    )
    matricula = result_mat.scalar_one_or_none()

    result_periodo = await db.execute(
        text("SELECT codigo, fecha_fin_matricula_regular, fecha_fin_matricula_extemporanea FROM periodos_academicos WHERE id = :pid"),
        {"pid": periodo_id}
    )
    periodo_row = result_periodo.mappings().first()
    periodo_codigo = periodo_row["codigo"] if periodo_row else "N/A"

    result_plan = await db.execute(
        text("""
            SELECT p.creditos_totales, p.nombre as plan_nombre, p.nivel_formativo
            FROM programas_estudio pr
            JOIN planes_estudio p ON pr.plan_estudio_id = p.id
            WHERE pr.id = :prog_id
        """),
        {"prog_id": estudiante.programa_id}
    )
    plan_row = result_plan.mappings().first()
    creditos_totales = plan_row["creditos_totales"] if plan_row else 0

    result_creditos_aprob = await db.execute(
        text("""
            SELECT COALESCE(SUM(md.creditos), 0) as total
            FROM matricula_detalles md
            JOIN matriculas m ON md.matricula_id = m.id
            WHERE m.estudiante_id = :eid
            AND md.estado_curso = 'aprobado'
        """),
        {"eid": estudiante_id}
    )
    creditos_aprobados = result_creditos_aprob.scalar()

    cursos_periodo = []
    if matricula and matricula.detalles:
        for det in matricula.detalles:
            result_unidad = await db.execute(
                text("SELECT nombre FROM unidades_plan WHERE id = :uid"),
                {"uid": det.unidad_didactica_id}
            )
            unidad_row = result_unidad.mappings().first()
            nombre_unidad = unidad_row["nombre"] if unidad_row else f"Unidad {det.unidad_didactica_id}"

            result_eval = await db.execute(
                text("""
                    SELECT nota_c1, nota_c2, nota_c3, nota_final, estado
                    FROM evaluacion_registros
                    WHERE matricula_detalle_id = :md_id
                """),
                {"md_id": det.id}
            )
            eval_row = result_eval.mappings().first()

            cursos_periodo.append({
                "unidad_nombre": nombre_unidad,
                "creditos": det.creditos,
                "nota_c1": eval_row["nota_c1"] if eval_row else None,
                "nota_c2": eval_row["nota_c2"] if eval_row else None,
                "nota_c3": eval_row["nota_c3"] if eval_row else None,
                "nota_final": eval_row["nota_final"] if eval_row else None,
                "estado": eval_row["estado"] if eval_row else det.estado_curso,
            })

    notas_finales = [c["nota_final"] for c in cursos_periodo if c["nota_final"] is not None]
    promedio_periodo = round(sum(notas_finales) / len(notas_finales)) if notas_finales else None
    aprobados = sum(1 for c in cursos_periodo if c["estado"] == "aprobado")
    desaprobados = sum(1 for c in cursos_periodo if c["estado"] == "desaprobado")

    result_hist = await db.execute(
        text("""
            SELECT DISTINCT m.periodo_id, pa.codigo as periodo_codigo
            FROM matriculas m
            JOIN periodos_academicos pa ON pa.id = m.periodo_id
            WHERE m.estudiante_id = :eid AND m.periodo_id != :current_pid
            ORDER BY pa.codigo
        """),
        {"eid": estudiante_id, "current_pid": periodo_id}
    )
    periodos_anteriores = result_hist.mappings().all()

    historial = []
    for p in periodos_anteriores:
        result_evals = await db.execute(
            text("""
                SELECT er.nota_final, er.estado
                FROM evaluacion_registros er
                WHERE er.estudiante_id = :eid AND er.periodo_id = :pid
            """),
            {"eid": estudiante_id, "pid": p["periodo_id"]}
        )
        evals = result_evals.mappings().all()
        notas_p = [e["nota_final"] for e in evals if e["nota_final"] is not None]
        hist_aprob = sum(1 for e in evals if e["estado"] == "aprobado")
        hist_desaprob = sum(1 for e in evals if e["estado"] == "desaprobado")
        historial.append({
            "periodo_codigo": p["periodo_codigo"],
            "promedio": round(sum(notas_p) / len(notas_p)) if notas_p else None,
            "cursos_aprobados": hist_aprob,
            "cursos_desaprobados": hist_desaprob,
        })

    result_observ = await db.execute(
        text("SELECT observaciones FROM matriculas WHERE estudiante_id = :eid AND periodo_id = :pid"),
        {"eid": estudiante_id, "pid": periodo_id}
    )
    observ_row = result_observ.mappings().first()
    observaciones = observ_row["observaciones"] if observ_row else None

    return {
        "estudiante": {
            "foto_url": estudiante.foto_url,
            "nombres": estudiante.nombres,
            "apellidos": estudiante.apellidos,
            "codigo_estudiante": estudiante.codigo_estudiante,
            "dni": estudiante.dni,
            "celular": estudiante.celular,
            "email_personal": estudiante.email_personal,
            "programa_nombre": plan_row["plan_nombre"] if plan_row else None,
            "periodo_codigo": periodo_codigo,
            "fecha_emision": datetime.utcnow().strftime("%d/%m/%Y"),
        },
        "matricula_estado": {
            "pago_matricula": estudiante.pago_matricula,
            "tipo_ingreso": matricula.tipo_ingreso if matricula else None,
            "estado_matricula": matricula.estado_matricula if matricula else "sin_matricula",
            "fecha_fin_matricula_regular": str(periodo_row["fecha_fin_matricula_regular"]) if periodo_row and periodo_row["fecha_fin_matricula_regular"] else None,
            "fecha_fin_matricula_extemporanea": str(periodo_row["fecha_fin_matricula_extemporanea"]) if periodo_row and periodo_row["fecha_fin_matricula_extemporanea"] else None,
        },
        "estado_academico": estudiante.estado_academico,
        "progreso_creditos": {
            "creditos_aprobados": creditos_aprobados,
            "creditos_totales": creditos_totales,
            "porcentaje": round((creditos_aprobados / creditos_totales) * 100) if creditos_totales > 0 else 0,
        },
        "cursos_periodo": cursos_periodo,
        "resumen": {
            "promedio_general": promedio_periodo,
            "cursos_aprobados": aprobados,
            "cursos_desaprobados": desaprobados,
            "total_cursos": len(cursos_periodo),
        },
        "historial": historial,
        "observaciones": observaciones,
    }

@router.put("/estudiantes/{estudiante_id}", response_model=EstudianteResponse)
async def actualizar_estudiante(estudiante_id: int, data: EstudianteUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))
    db_estudiante = result.scalar_one_or_none()
    if not db_estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_estudiante, key, value)

    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "gestion_academica.estudiante.actualizado",
        "source": "mod-gestion-academica",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "data": {"id": db_estudiante.id},
        "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
    }

    db.add(OutboxEvent(event_type=event_payload["event_type"], payload=event_payload))
    await db.commit()
    await db.refresh(db_estudiante)
    return db_estudiante

@router.delete("/estudiantes/{estudiante_id}")
async def eliminar_estudiante(estudiante_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))
    db_estudiante = result.scalar_one_or_none()
    if not db_estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    await db.delete(db_estudiante)

    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "gestion_academica.estudiante.eliminado",
        "source": "mod-gestion-academica",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "data": {"id": estudiante_id},
        "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
    }
    
    db.add(OutboxEvent(event_type=event_payload["event_type"], payload=event_payload))
    await db.commit()
    return {"message": "Estudiante eliminado"}

@router.post("/matriculas/", response_model=MatriculaResponse, status_code=status.HTTP_201_CREATED)
async def realizar_matricula(request: Request, data: MatriculaCreate, db: AsyncSession = Depends(get_db)):
    # Validar si ya está matriculado en este periodo
    from sqlalchemy.future import select
    existing = await db.execute(
        select(Matricula).where(
            Matricula.estudiante_id == data.estudiante_id,
            Matricula.periodo_id == data.periodo_id,
            Matricula.estado_matricula != 'anulado'
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="El estudiante ya cuenta con una matrícula registrada para este periodo académico.")

    # Validar créditos
    total_creditos = sum(d.creditos for d in data.detalles)
    if total_creditos < 1 or total_creditos > 40:
        raise HTTPException(status_code=400, detail=f"La matrícula tiene {total_creditos} créditos. Debe estar entre 1 y 40 créditos")

    # Separar detalles
    matricula_data = data.model_dump(exclude={"detalles"})
    db_matricula = Matricula(**matricula_data)
    db.add(db_matricula)
    await db.flush() # Para obtener db_matricula.id

    for det in data.detalles:
        db_detalle = MatriculaDetalle(matricula_id=db_matricula.id, **det.model_dump())
        db.add(db_detalle)
    
    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "gestion_academica.matricula.confirmada",
        "source": "mod-gestion-academica",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "data": {"matricula_id": db_matricula.id, "estudiante_id": db_matricula.estudiante_id, "creditos": total_creditos},
        "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
    }
    
    db.add(OutboxEvent(event_type=event_payload["event_type"], payload=event_payload))
    await db.commit()
    
    result = await db.execute(select(Matricula).options(selectinload(Matricula.detalles)).where(Matricula.id == db_matricula.id))
    return result.scalar_one()

@router.get("/matriculas/", response_model=List[MatriculaResponse])
async def obtener_matriculas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Matricula).options(selectinload(Matricula.detalles)).order_by(Matricula.created_at.desc()))
    return result.scalars().all()

@router.get("/matriculas/estudiante/{estudiante_id}", response_model=List[MatriculaResponse])
async def obtener_matriculas_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Matricula).options(selectinload(Matricula.detalles)).where(Matricula.estudiante_id == estudiante_id).order_by(Matricula.created_at.desc()))
    return result.scalars().all()

@router.get("/matriculas/unidad/{unidad_id}/periodo/{periodo_id}")
async def obtener_estudiantes_por_unidad(unidad_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    query = (
        select(Estudiante, MatriculaDetalle.id.label("matricula_detalle_id"))
        .join(Matricula, Matricula.estudiante_id == Estudiante.id)
        .join(MatriculaDetalle, MatriculaDetalle.matricula_id == Matricula.id)
        .where(Matricula.periodo_id == periodo_id)
        .where(MatriculaDetalle.unidad_didactica_id == unidad_id)
        .where(Matricula.estado_matricula != "anulada")
    )
    result = await db.execute(query)
    rows = result.all()
    
    response = []
    for est, det_id in rows:
        est_dict = EstudianteResponse.model_validate(est).model_dump()
        est_dict["matricula_detalle_id"] = det_id
        response.append(est_dict)
        
    return response

@router.delete("/matriculas/{matricula_id}")
async def anular_matricula(matricula_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Matricula).where(Matricula.id == matricula_id))
    db_matricula = result.scalar_one_or_none()
    if not db_matricula:
        raise HTTPException(status_code=404, detail="Matrícula no encontrada")

    db_matricula.estado_matricula = "anulada"
    
    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "gestion_academica.matricula.anulada",
        "source": "mod-gestion-academica",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "data": {"matricula_id": matricula_id, "estudiante_id": db_matricula.estudiante_id},
        "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
    }
    
    db.add(OutboxEvent(event_type=event_payload["event_type"], payload=event_payload))
    await db.commit()
    return {"message": "Matrícula anulada correctamente"}

# ================================
# FASE 4: TRAMITES Y CASUISTICAS
# ================================
from schemas import (
    SolicitudTramiteCreate, SolicitudTramiteResponse, 
    ResolucionConvalidacionCreate, ResolucionConvalidacionResponse,
    BeneficioEstudianteCreate, BeneficioEstudianteResponse
)
from models import SolicitudTramite, ResolucionConvalidacion, ConvalidacionDetalle, BeneficioEstudiante

@router.post("/tramites/", response_model=SolicitudTramiteResponse, status_code=status.HTTP_201_CREATED)
async def crear_tramite(data: SolicitudTramiteCreate, db: AsyncSession = Depends(get_db)):
    db_tramite = SolicitudTramite(**data.model_dump())
    db.add(db_tramite)
    await db.commit()
    await db.refresh(db_tramite)
    return db_tramite

@router.get("/tramites/", response_model=List[SolicitudTramiteResponse])
async def obtener_tramites(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolicitudTramite).order_by(SolicitudTramite.fecha_solicitud.desc()))
    return result.scalars().all()

@router.put("/tramites/{tramite_id}/estado", response_model=SolicitudTramiteResponse)
async def actualizar_estado_tramite(tramite_id: int, estado: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolicitudTramite).where(SolicitudTramite.id == tramite_id))
    db_tramite = result.scalar_one_or_none()
    if not db_tramite:
        raise HTTPException(status_code=404, detail="Trámite no encontrado")
    
    db_tramite.estado = estado
    if estado in ["emitido", "rechazado", "aprobado"]:
        db_tramite.fecha_resolucion = datetime.utcnow().date()
        
    await db.commit()
    await db.refresh(db_tramite)
    return db_tramite

@router.post("/convalidaciones/", response_model=ResolucionConvalidacionResponse, status_code=status.HTTP_201_CREATED)
async def registrar_convalidacion(data: ResolucionConvalidacionCreate, db: AsyncSession = Depends(get_db)):
    conval_data = data.model_dump(exclude={"detalles"})
    db_resolucion = ResolucionConvalidacion(**conval_data)
    db.add(db_resolucion)
    await db.flush() # para obtener el ID de la resolucion

    for det in data.detalles:
        db_detalle = ConvalidacionDetalle(resolucion_id=db_resolucion.id, **det.model_dump())
        db.add(db_detalle)

    await db.commit()
    # Refresh with relation
    result = await db.execute(select(ResolucionConvalidacion).options(selectinload(ResolucionConvalidacion.detalles)).where(ResolucionConvalidacion.id == db_resolucion.id))
    return result.scalar_one()

@router.get("/convalidaciones/estudiante/{estudiante_id}", response_model=List[ResolucionConvalidacionResponse])
async def obtener_convalidaciones_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResolucionConvalidacion).options(selectinload(ResolucionConvalidacion.detalles)).where(ResolucionConvalidacion.estudiante_id == estudiante_id))
    return result.scalars().all()

@router.post("/beneficios/", response_model=BeneficioEstudianteResponse, status_code=status.HTTP_201_CREATED)
async def registrar_beneficio(data: BeneficioEstudianteCreate, db: AsyncSession = Depends(get_db)):
    db_beneficio = BeneficioEstudiante(**data.model_dump())
    db.add(db_beneficio)
    await db.commit()
    await db.refresh(db_beneficio)
    return db_beneficio

@router.get("/beneficios/estudiante/{estudiante_id}", response_model=List[BeneficioEstudianteResponse])
async def obtener_beneficios_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BeneficioEstudiante).where(BeneficioEstudiante.estudiante_id == estudiante_id, BeneficioEstudiante.activo == True))
    return result.scalars().all()

