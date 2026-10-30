from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import List, Optional
from datetime import datetime, date, timezone
from zoneinfo import ZoneInfo

from database import get_db, OutboxEvent
from models import RegistroEvaluacion
from schemas import (
    RegistroEvaluacionCreate, RegistroEvaluacionResponse, RegistroEvaluacionUpdate,
    EstadoActaUnidadResponse, ResumenActasProgramaResponse, CargaActaItem, UnidadSinCargaItem,
    FechaLimiteRequest, ReabrirActaRequest, CerrarActaResponse
)

router = APIRouter()

def get_hoy_lima() -> date:
    """Retorna la fecha actual en la zona horaria institucional America/Lima."""
    return datetime.now(ZoneInfo("America/Lima")).date()

def get_now_utc() -> datetime:
    """Retorna la fecha y hora actual en UTC (offset-naive para columnas TIMESTAMP WITHOUT TIME ZONE)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

def _condicion_matricula_calificable_sql(alias_m="m", alias_md="md") -> str:
    """Retorna la condición SQL canónica institucional para matrículas calificables:
    - Estado de matrícula: 'confirmada'
    - Condición de curso: diferente de 'retirado' (o nula)
    """
    return f"({alias_m}.estado_matricula = 'confirmada' AND ({alias_md}.estado_curso IS NULL OR {alias_md}.estado_curso != 'retirado'))"

def _exigir_user_id_numerico(request: Request) -> int:
    """Valida la presencia y formato numérico de la cabecera X-User-ID."""
    user_id_str = request.headers.get("X-User-ID")
    if not user_id_str or not user_id_str.strip().isdigit():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cabecera X-User-ID faltante o inválida. Se requiere un identificador numérico de usuario."
        )
    return int(user_id_str.strip())

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
    Busca la fila de carga_lectiva por (unidad_didactica_id, periodo_id) con bloqueo compartido (FOR SHARE):
    - Si no hay fila: solo rige la regla del periodo (no inventar filas).
    - Si hay filas:
      * El acta está cerrada solo si TODAS están cerradas.
      * La fecha límite efectiva es la más tardía (NULL significa sin límite).
      * Si hay más de una fila por par (unidad, periodo), documenta la limitación de secciones.
      * Acta cerrada: 409 con mensaje en español ("El acta de la unidad X del periodo Y está cerrada. Solicite su reapertura al coordinador.").
      * Fecha vencida: 409 ("El plazo para ingresar notas venció el DD/MM/AAAA. Solicite una ampliación al coordinador.").
    """
    carga_res = await db.execute(
        text("SELECT acta_cerrada, fecha_limite_notas FROM carga_lectiva WHERE unidad_didactica_id = :u_id AND periodo_id = :p_id FOR SHARE"),
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

    # 1.b Validar reglas de cierre de acta y fecha límite (PASO 2 y 4)
    await _validar_cierre_y_fecha_limite(db, data.unidad_didactica_id, data.periodo_id, codigo_periodo)

    # 2. Validar que la matrícula exista y corresponda a la unidad y periodo (BUG-D04 / PASO 1)
    mat_res = await db.execute(
        text("""
            SELECT md.id, m.estado_matricula, md.estado_curso
            FROM matricula_detalles md
            JOIN matriculas m ON md.matricula_id = m.id
            WHERE md.id = :det_id 
              AND md.unidad_didactica_id = :u_id
              AND m.estudiante_id = :est_id
              AND m.periodo_id = :per_id
        """),
        {
            "det_id": data.matricula_detalle_id,
            "u_id": data.unidad_didactica_id,
            "est_id": data.estudiante_id,
            "per_id": data.periodo_id
        }
    )
    mat_row = mat_res.fetchone()
    if not mat_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una matrícula activa válida que corresponda al estudiante, unidad didáctica y periodo indicados."
        )

    estado_mat = mat_row[1]
    estado_cur = mat_row[2]
    if estado_mat == "pendiente":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La matrícula del estudiante se encuentra en estado 'pendiente'. Solo se permite calificar matrículas en estado 'confirmada'."
        )
    if estado_mat != "confirmada":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La matrícula se encuentra en estado '{estado_mat}'. No se permite calificar."
        )
    if estado_cur == "retirado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El estudiante se encuentra en estado 'retirado' en esta unidad didáctica."
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
    """Resumen de actas para el coordinador: lista cargas lectivas, unidades sin carga del programa y unidades sin programa."""
    calificables_cond = _condicion_matricula_calificable_sql("m", "md")

    # 1. Cargas lectivas asignadas a este programa y periodo
    cargas_res = await db.execute(
        text("""
            SELECT cl.id, cl.unidad_didactica_id, cl.docente_id, cl.fecha_limite_notas, cl.acta_cerrada,
                   COALESCE(pu.nombre, up.nombre, 'Unidad ' || cl.unidad_didactica_id) AS unidad_nombre
            FROM carga_lectiva cl
            LEFT JOIN programa_unidades pu ON pu.id = cl.unidad_didactica_id
            LEFT JOIN unidades_plan up ON up.id = cl.unidad_didactica_id
            WHERE cl.periodo_id = :p_id AND cl.programa_id = :prog_id
            ORDER BY cl.id;
        """),
        {"p_id": periodo_id, "prog_id": programa_id}
    )
    cargas_rows = cargas_res.fetchall()

    cargas_items = []
    cargas_u_ids = set()
    total_gral_pendientes = 0

    for row in cargas_rows:
        carga_id, u_id, docente_id, f_limite, a_cerrada, u_nombre = row
        cargas_u_ids.add(u_id)

        # Calcular estadísticas por (unidad, periodo) sin filtrar por el programa de la matrícula
        stats_res = await db.execute(
            text(f"""
                SELECT 
                    count(DISTINCT CASE WHEN {calificables_cond} THEN md.id END) AS total_matriculas,
                    count(DISTINCT CASE WHEN {calificables_cond} AND er.nota_final IS NOT NULL THEN md.id END) AS con_nota_final,
                    count(DISTINCT CASE WHEN m.estado_matricula = 'pendiente' THEN md.id END) AS matriculas_pendientes
                FROM matricula_detalles md
                JOIN matriculas m ON m.id = md.matricula_id
                LEFT JOIN evaluacion_registros er ON er.matricula_detalle_id = md.id
                WHERE md.unidad_didactica_id = :u_id 
                  AND m.periodo_id = :p_id;
            """),
            {"u_id": u_id, "p_id": periodo_id}
        )
        s_row = stats_res.fetchone()
        tot = s_row[0] if s_row else 0
        con_n = s_row[1] if s_row else 0
        pend = s_row[2] if s_row else 0
        falt = max(0, tot - con_n)
        total_gral_pendientes += pend

        cargas_items.append(CargaActaItem(
            carga_id=carga_id,
            unidad_didactica_id=u_id,
            unidad=u_nombre,
            docente_id=docente_id,
            fecha_limite_notas=f_limite,
            acta_cerrada=bool(a_cerrada),
            total_matriculas=tot,
            con_nota_final=con_n,
            faltantes=falt,
            matriculas_pendientes=pend
        ))

    # 2. Identificar otras unidades con actividad académica en este periodo que no tienen carga en este programa
    actividad_res = await db.execute(
        text("""
            SELECT DISTINCT unidad_id FROM (
                SELECT md.unidad_didactica_id AS unidad_id
                FROM matricula_detalles md
                JOIN matriculas m ON m.id = md.matricula_id
                WHERE m.periodo_id = :p_id
                UNION
                SELECT er.unidad_didactica_id AS unidad_id
                FROM evaluacion_registros er
                WHERE er.periodo_id = :p_id
            ) t
            ORDER BY unidad_id;
        """),
        {"p_id": periodo_id}
    )
    todas_u_ids = [r[0] for r in actividad_res.fetchall()]
    otras_u_ids = [u for u in todas_u_ids if u not in cargas_u_ids]

    unidades_sin_carga = []
    unidades_sin_programa = []

    for u_id in otras_u_ids:
        # Verificar si la unidad pertenece formalmente al programa solicitado
        pu_check = await db.execute(
            text("""
                SELECT pu.nombre 
                FROM programa_unidades pu
                JOIN programa_modulos pm ON pm.id = pu.programa_modulo_id
                WHERE pu.id = :u_id AND pm.programa_id = :prog_id
            """),
            {"u_id": u_id, "prog_id": programa_id}
        )
        pu_row = pu_check.fetchone()

        up_check = await db.execute(
            text("""
                SELECT up.nombre 
                FROM unidades_plan up
                JOIN modulos_plan mp ON mp.id = up.modulo_id
                JOIN planes_estudio pe ON pe.id = mp.plan_id
                JOIN programas_estudio prog ON prog.plan_estudio_id = pe.id
                WHERE up.id = :u_id AND prog.id = :prog_id
            """),
            {"u_id": u_id, "prog_id": programa_id}
        )
        up_row = up_check.fetchone()

        pu_nombre = pu_row[0] if pu_row else None
        up_nombre = up_row[0] if up_row else None
        if not pu_nombre and not up_nombre:
            pu_res = await db.execute(text("SELECT nombre FROM programa_unidades WHERE id = :u_id"), {"u_id": u_id})
            pu_n = pu_res.fetchone()
            pu_nombre = pu_n[0] if pu_n else None
            if not pu_nombre:
                up_res = await db.execute(text("SELECT nombre FROM unidades_plan WHERE id = :u_id"), {"u_id": u_id})
                up_n = up_res.fetchone()
                up_nombre = up_n[0] if up_n else None

        nombre_unidad = pu_nombre or up_nombre or f"Unidad {u_id}"

        # Estadísticas en este periodo
        stats_res = await db.execute(
            text(f"""
                SELECT 
                    count(DISTINCT CASE WHEN {calificables_cond} THEN md.id END) AS total_matriculas,
                    count(DISTINCT CASE WHEN {calificables_cond} AND er.nota_final IS NOT NULL THEN md.id END) AS con_nota_final,
                    count(DISTINCT CASE WHEN m.estado_matricula = 'pendiente' THEN md.id END) AS matriculas_pendientes
                FROM matricula_detalles md
                JOIN matriculas m ON m.id = md.matricula_id
                LEFT JOIN evaluacion_registros er ON er.matricula_detalle_id = md.id
                WHERE md.unidad_didactica_id = :u_id 
                  AND m.periodo_id = :p_id;
            """),
            {"u_id": u_id, "p_id": periodo_id}
        )
        s_row = stats_res.fetchone()
        tot = s_row[0] if s_row else 0
        con_n = s_row[1] if s_row else 0
        pend = s_row[2] if s_row else 0
        falt = max(0, tot - con_n)
        total_gral_pendientes += pend

        item = UnidadSinCargaItem(
            unidad_didactica_id=u_id,
            unidad=nombre_unidad,
            total_matriculas=tot,
            con_nota_final=con_n,
            faltantes=falt,
            matriculas_pendientes=pend
        )

        if pu_row or up_row:
            unidades_sin_carga.append(item)
        else:
            unidades_sin_programa.append(item)

    return ResumenActasProgramaResponse(
        cargas=cargas_items,
        unidades_sin_carga=unidades_sin_carga,
        unidades_sin_programa=unidades_sin_programa,
        total_matriculas_pendientes=total_gral_pendientes
    )

@router.put("/actas/carga/{carga_id}/fecha-limite")
async def actualizar_fecha_limite_carga(carga_id: int, data: FechaLimiteRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Fija la fecha límite de ingreso de notas para una carga lectiva."""
    user_id = _exigir_user_id_numerico(request)
    hoy = get_hoy_lima()
    if data.fecha_limite_notas < hoy:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha límite debe ser igual o posterior a la fecha actual."
        )

    carga_res = await db.execute(
        text("SELECT id, periodo_id, programa_id, unidad_didactica_id, acta_cerrada, fecha_limite_notas FROM carga_lectiva WHERE id = :id FOR UPDATE"),
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

    req_id = request.headers.get("X-Request-ID", "unknown")
    now_utc = get_now_utc()

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
            "timestamp": now_utc.isoformat(),
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
    user_id = _exigir_user_id_numerico(request)
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
        text("SELECT id FROM carga_lectiva WHERE programa_id = :prog_id AND periodo_id = :p_id AND acta_cerrada = false FOR UPDATE"),
        {"prog_id": programa_id, "p_id": periodo_id}
    )
    cargas_ids = [r[0] for r in cargas_res.fetchall()]

    if cargas_ids:
        await db.execute(
            text("UPDATE carga_lectiva SET fecha_limite_notas = :f, updated_at = NOW() WHERE id = ANY(:ids)"),
            {"f": data.fecha_limite_notas, "ids": cargas_ids}
        )

    req_id = request.headers.get("X-Request-ID", "unknown")
    now_utc = get_now_utc()

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
            "timestamp": now_utc.isoformat(),
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

@router.post("/actas/carga/{carga_id}/cerrar", response_model=CerrarActaResponse)
async def cerrar_acta_carga(carga_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Cierra el acta de una carga lectiva verificando que todas las matrículas calificables tengan calificación final."""
    user_id = _exigir_user_id_numerico(request)

    carga_res = await db.execute(
        text("SELECT id, periodo_id, programa_id, unidad_didactica_id, acta_cerrada FROM carga_lectiva WHERE id = :id FOR UPDATE"),
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

    # 1. Verificar cantidad de matrículas calificables (regla única: confirmada y no retirada)
    calificables_cond = _condicion_matricula_calificable_sql("m", "md")
    tot_res = await db.execute(
        text(f"""
            SELECT count(md.id)
            FROM matricula_detalles md
            JOIN matriculas m ON m.id = md.matricula_id
            WHERE md.unidad_didactica_id = :u_id 
              AND m.periodo_id = :p_id
              AND {calificables_cond}
        """),
        {"u_id": carga[3], "p_id": carga[1]}
    )
    total_calificables = tot_res.scalar() or 0
    if total_calificables == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede cerrar el acta: la unidad no cuenta con matrículas calificables en este periodo."
        )

    # 2. Verificar que CADA matrícula calificable tenga nota_final no nula
    faltantes_res = await db.execute(
        text(f"""
            SELECT md.matricula_id, er.nota_final
            FROM matricula_detalles md
            JOIN matriculas m ON m.id = md.matricula_id
            LEFT JOIN evaluacion_registros er ON er.matricula_detalle_id = md.id
            WHERE md.unidad_didactica_id = :u_id 
              AND m.periodo_id = :p_id 
              AND {calificables_cond}
              AND (er.id IS NULL OR er.nota_final IS NULL);
        """),
        {"u_id": carga[3], "p_id": carga[1]}
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

    # 3. Verificar si existen matrículas pendientes para generar advertencia (PASO 4b)
    pend_res = await db.execute(
        text("""
            SELECT count(md.id)
            FROM matricula_detalles md
            JOIN matriculas m ON m.id = md.matricula_id
            WHERE md.unidad_didactica_id = :u_id 
              AND m.periodo_id = :p_id 
              AND m.estado_matricula = 'pendiente';
        """),
        {"u_id": carga[3], "p_id": carga[1]}
    )
    pendientes_count = pend_res.scalar() or 0
    advertencia = None
    if pendientes_count > 0:
        advertencia = f"Atención: existen {pendientes_count} matrícula(s) en estado pendiente que no fueron consideradas para el cierre del acta."

    now_ts = get_now_utc()
    now_db = now_ts.replace(tzinfo=None) if getattr(now_ts, "tzinfo", None) else now_ts

    # 4. Guardar acta cerrada en carga_lectiva
    await db.execute(
        text("""
            UPDATE carga_lectiva 
            SET acta_cerrada = true, 
                acta_cerrada_at = :now, 
                acta_cerrada_por = :u_id, 
                updated_at = NOW() 
            WHERE id = :id
        """),
        {"now": now_db, "u_id": user_id, "id": carga_id}
    )

    # PASO 3: evaluacion_registros.estado NO se sobreescribe a 'cerrado' para preservar la condición académica ('aprobado'/'desaprobado')

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
                "acta_cerrada_por": user_id
            },
            "motivo": "Cierre regular de acta de evaluación",
            "user_id": user_id,
            "timestamp": now_ts.isoformat(),
            "metadata": {"request_id": req_id, "user_id": user_id}
        }
    )
    db.add(event)
    await db.commit()

    return CerrarActaResponse(
        message="Acta cerrada exitosamente",
        carga_id=carga_id,
        acta_cerrada=True,
        acta_cerrada_at=now_ts,
        acta_cerrada_por=user_id,
        total_calificados=total_calificables,
        advertencia=advertencia
    )

@router.post("/actas/carga/{carga_id}/reabrir")
async def reabrir_acta_carga(carga_id: int, data: ReabrirActaRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Reabre un acta cerrada exigiendo motivo justificatorio y nueva fecha límite."""
    user_id = _exigir_user_id_numerico(request)

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
        text("SELECT id, periodo_id, programa_id, unidad_didactica_id, acta_cerrada, fecha_limite_notas, acta_cerrada_por FROM carga_lectiva WHERE id = :id FOR UPDATE"),
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

    # PASO 3: evaluacion_registros.estado NO se altera al reabrir, se mantiene intacta la calificación

    req_id = request.headers.get("X-Request-ID", "unknown")
    now_ts = get_now_utc()

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
            "user_id": user_id,
            "timestamp": now_ts.isoformat(),
            "metadata": {"request_id": req_id, "user_id": user_id}
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
