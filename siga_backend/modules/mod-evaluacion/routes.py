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
    UnidadSoloPendientesItem, FechaLimiteRequest, ReabrirActaRequest, CerrarActaResponse
)
from shared.identity import (
    Identity, get_identity, es_superadmin, es_coordinador_de, es_docente_de_carga
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

def _es_matricula_calificable(estado_matricula: str, estado_curso: Optional[str]) -> bool:
    """Evalúa en memoria si una matrícula y detalle cumplen la condición calificable canónica."""
    return estado_matricula == "confirmada" and (estado_curso is None or estado_curso != "retirado")

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

async def _obtener_programa_unidad_catalogo(db: AsyncSession, unidad_id: int) -> Optional[int]:
    """Obtiene el programa_id que el catálogo académico asocia a una unidad didáctica."""
    # 1. Buscar en programa_unidades
    pu_res = await db.execute(
        text("""
            SELECT pm.programa_id
            FROM programa_unidades pu
            JOIN programa_modulos pm ON pm.id = pu.programa_modulo_id
            WHERE pu.id = :u_id
        """),
        {"u_id": unidad_id}
    )
    row = pu_res.fetchone()
    if row and row[0] is not None:
        return row[0]

    # 2. Buscar en unidades_plan
    up_res = await db.execute(
        text("""
            SELECT prog.id
            FROM unidades_plan up
            JOIN modulos_plan mp ON mp.id = up.modulo_id
            JOIN planes_estudio pe ON pe.id = mp.plan_id
            JOIN programas_estudio prog ON prog.plan_estudio_id = pe.id
            WHERE up.id = :u_id
        """),
        {"u_id": unidad_id}
    )
    row = up_res.fetchone()
    if row and row[0] is not None:
        return row[0]

    return None

async def _validar_acceso_unidad(ident: Identity, unidad_id: int, periodo_id: int, db: AsyncSession):
    """Valida permisos para ver registros o actas de una unidad:
    - Superadmin: acceso completo.
    - Docente asignado a la carga lectiva: acceso a su unidad.
    - Coordinador del programa de la carga (o del catálogo si no hay carga): acceso.
    - De lo contrario: 403 No tiene permisos para esta operación.
    """
    if es_superadmin(ident):
        return

    carga_res = await db.execute(
        text("SELECT docente_id, programa_id FROM carga_lectiva WHERE unidad_didactica_id = :u AND periodo_id = :p"),
        {"u": unidad_id, "p": periodo_id}
    )
    cargas = carga_res.fetchall()
    if cargas:
        # Docente asignado a la unidad en este periodo
        if any(c[0] == ident.user_id for c in cargas):
            return
        # Coordinador del programa asignado a la carga
        if any(c[1] is not None and es_coordinador_de(ident, c[1]) for c in cargas):
            return

    # Si no hay carga o no tiene programa_id asociado, consultar catálogo académico
    prog_id = await _obtener_programa_unidad_catalogo(db, unidad_id)
    if prog_id is not None and es_coordinador_de(ident, prog_id):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tiene permisos para esta operación"
    )

async def _validar_cierre_y_fecha_limite(db: AsyncSession, unidad_didactica_id: int, periodo_id: int, codigo_periodo: str):
    """
    Busca la fila de carga_lectiva por (unidad_didactica_id, periodo_id) con bloqueo compartido (FOR SHARE):
    - Si no hay fila: solo rige la regla del periodo (no inventar filas).
    - Si hay filas:
      * El acta está cerrada solo si TODAS están cerradas.
      * La fecha límite efectiva es la más tardía (NULL significa sin límite).
      * Acta cerrada: 409 con mensaje institucional.
      * Fecha vencida: 409 con mensaje institucional.
    """
    carga_res = await db.execute(
        text("SELECT acta_cerrada, fecha_limite_notas FROM carga_lectiva WHERE unidad_didactica_id = :u_id AND periodo_id = :p_id FOR SHARE"),
        {"u_id": unidad_didactica_id, "p_id": periodo_id}
    )
    cargas = carga_res.fetchall()
    if not cargas:
        return

    todas_cerradas = all(bool(c[0]) for c in cargas)
    if todas_cerradas:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El acta de la unidad {unidad_didactica_id} del periodo {codigo_periodo} está cerrada. Solicite su reapertura al coordinador."
        )

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
    # 0. Verificación de Identidad y Autorización por Roles (BUG-D02 / PASO 2)
    ident = await get_identity(request, db)
    if not es_superadmin(ident):
        carga_res = await db.execute(
            text("SELECT id, docente_id FROM carga_lectiva WHERE unidad_didactica_id = :u AND periodo_id = :p"),
            {"u": data.unidad_didactica_id, "p": data.periodo_id}
        )
        cargas = carga_res.fetchall()
        if not cargas:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La unidad no tiene docente asignado. Solicite la asignación de carga lectiva al coordinador."
            )
        if not any(c[1] == ident.user_id for c in cargas):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para esta operación"
            )

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
    if not _es_matricula_calificable(estado_mat, estado_cur):
        if estado_mat == "pendiente":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La matrícula del estudiante se encuentra en estado 'pendiente'. Solo se permite calificar matrículas en estado 'confirmada'."
            )
        if estado_cur == "retirado":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El estudiante se encuentra en estado 'retirado' en esta unidad didáctica."
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La matrícula se encuentra en estado '{estado_mat}'. No se permite calificar."
        )

    # 3. Validar no duplicidad
    result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.matricula_detalle_id == data.matricula_detalle_id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un registro de evaluación para este detalle de matrícula")

    db_obj = RegistroEvaluacion(**data.model_dump())
    _aplicar_notas(db_obj, nota_final_solicitada=data.nota_final)

    db.add(db_obj)
    await db.flush()

    event = OutboxEvent(
        event_type="evaluacion.nota.creada",
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

@router.get("/registros/unidad/{unidad_id}/periodo/{periodo_id}", response_model=List[RegistroEvaluacionResponse])
async def listar_registros_por_unidad(unidad_id: int, periodo_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    ident = await get_identity(request, db)
    await _validar_acceso_unidad(ident, unidad_id, periodo_id, db)

    result = await db.execute(
        select(RegistroEvaluacion)
        .where(
            RegistroEvaluacion.unidad_didactica_id == unidad_id,
            RegistroEvaluacion.periodo_id == periodo_id
        )
    )
    return result.scalars().all()

@router.get("/resumen/periodo/{periodo_id}")
async def resumen_avance_notas(periodo_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Avance real de registro de notas por unidad didáctica (para supervisión del coordinador o superadmin)."""
    ident = await get_identity(request, db)
    # Coordinador sin programa_id asignado no tiene alcance para supervisar resumen
    if not (es_superadmin(ident) or ("coordinador_programa" in ident.roles and ident.programa_id is not None)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para esta operación"
        )

    calificables_cond = _condicion_matricula_calificable_sql("m", "md")
    result = await db.execute(
        text(f"""
            SELECT 
                er.unidad_didactica_id,
                count(er.id) AS total,
                count(er.nota_final) AS calificados
            FROM evaluacion_registros er
            JOIN matricula_detalles md ON er.matricula_detalle_id = md.id
            JOIN matriculas m ON md.matricula_id = m.id
            WHERE er.periodo_id = :p_id
              AND {calificables_cond}
            GROUP BY er.unidad_didactica_id
        """),
        {"p_id": periodo_id}
    )
    return [
        {
            "unidad_didactica_id": row[0],
            "total": row[1],
            "calificados": row[2],
            "porcentaje": round(row[2] * 100 / row[1]) if row[1] else 0,
        }
        for row in result.fetchall()
    ]

def _validar_nota_vigesimal(valor) -> Optional[int]:
    """Valida la escala vigesimal institucional [0, 20]. Rechaza valores fuera de rango o tipos inválidos con HTTP 422."""
    if valor is None or valor == "":
        return None
    if isinstance(valor, bool):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Las notas deben estar entre 0 y 20"
        )
    try:
        num = float(valor)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Las notas deben estar entre 0 y 20"
        )
    if num < 0 or num > 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Las notas deben estar entre 0 y 20"
        )
    return round(num)

@router.post("/registros/batch")
@router.put("/registros/batch")
async def guardar_registros_batch(items: List[dict], request: Request, db: AsyncSession = Depends(get_db)):
    """Guarda o actualiza múltiples registros de evaluación en una sola transacción con validaciones de seguridad."""
    # 1. Autenticación e Identidad (BUG-D02 / R1) - DEBE ejecutarse antes de validar el contenido del lote
    user = await get_identity(request, db)

    if not items:
        return []

    # 2. Precarga y resolución de registros para identificar (unidad_didactica_id, periodo_id)
    reg_ids = [item.get("id") or item.get("registro_id") for item in items if (item.get("id") or item.get("registro_id"))]
    mat_ids = [item.get("matricula_detalle_id") or item.get("matricula_id") for item in items if (item.get("matricula_detalle_id") or item.get("matricula_id"))]

    existing_by_id = {}
    if reg_ids:
        res = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.id.in_(reg_ids)))
        for r in res.scalars():
            existing_by_id[r.id] = r

    existing_by_mat = {}
    if mat_ids:
        res = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.matricula_detalle_id.in_(mat_ids)))
        for r in res.scalars():
            existing_by_mat[r.matricula_detalle_id] = r

    pares_unidad_periodo = set()
    for item in items:
        rid = item.get("id") or item.get("registro_id")
        mid = item.get("matricula_detalle_id") or item.get("matricula_id")
        db_obj = existing_by_id.get(rid) if rid else (existing_by_mat.get(mid) if mid else None)

        if db_obj:
            # BLINDAJE CRÍTICO BOLA / IDOR: Si el registro ya existe en BD,
            # la unidad y periodo autoritativos provienen ESTRICTAMENTE de db_obj.
            u_id = db_obj.unidad_didactica_id
            p_id = db_obj.periodo_id

            # Validación de integridad: si el cliente envía unidad o periodo discrepante, rechazar
            client_u = item.get("unidad_didactica_id") or item.get("unidad_id")
            client_p = item.get("periodo_id")
            if (client_u is not None and int(client_u) != u_id) or (client_p is not None and int(client_p) != p_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Inconsistencia de unidad didáctica o periodo en el registro"
                )
        else:
            # Registro nuevo a insertar
            u_id = item.get("unidad_didactica_id") or item.get("unidad_id")
            p_id = item.get("periodo_id")

            if (u_id is None or p_id is None) and mid:
                md_res = await db.execute(
                    text("SELECT md.unidad_didactica_id, m.periodo_id FROM matricula_detalles md JOIN matriculas m ON md.matricula_id = m.id WHERE md.id = :mid"),
                    {"mid": mid}
                )
                md_row = md_res.fetchone()
                if md_row:
                    u_id = md_row[0]
                    p_id = md_row[1]

        if u_id is not None and p_id is not None:
            pares_unidad_periodo.add((int(u_id), int(p_id)))

    if not pares_unidad_periodo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se pudo determinar la unidad didáctica o periodo para los registros."
        )

    # 3. Verificación de permisos y estado para cada unidad/periodo
    for u_id, p_id in sorted(pares_unidad_periodo):
        # 3.a Titularidad docente o superadmin (403 antes que 409)
        if not es_superadmin(user):
            carga_res = await db.execute(
                text("SELECT id, docente_id FROM carga_lectiva WHERE unidad_didactica_id = :u AND periodo_id = :p"),
                {"u": u_id, "p": p_id}
            )
            cargas = carga_res.fetchall()
            if not cargas:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="La unidad no tiene docente asignado. Solicite la asignación de carga lectiva al coordinador."
                )
            if not any(c[1] == user.user_id for c in cargas):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tiene permisos para esta operación"
                )

        # 3.b Validar que el periodo académico permita calificación (409)
        per_res = await db.execute(
            text("SELECT codigo, estado FROM periodos_academicos WHERE id = :p_id"),
            {"p_id": p_id}
        )
        per_row = per_res.fetchone()
        codigo_periodo = per_row[0] if per_row else str(p_id)
        estado_periodo = per_row[1] if per_row else None

        if estado_periodo not in ESTADOS_PERIODO_CALIFICABLES:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El periodo académico {codigo_periodo} se encuentra en estado '{estado_periodo}'. No se permite modificar calificaciones."
            )

        # 3.c Validar reglas de cierre de acta y fecha límite en carga_lectiva (409)
        await _validar_cierre_y_fecha_limite(db, u_id, p_id, codigo_periodo)

    # 4. Validar escala vigesimal [0, 20] en todos los items (422)
    for item in items:
        for field in ("nota_c1", "nota_c2", "nota_c3", "nota_final"):
            if field in item:
                _validar_nota_vigesimal(item[field])

    # 5. Aplicar actualizaciones / inserciones en la transacción
    try:
        actualizados = []
        for item in items:
            val_c1 = _validar_nota_vigesimal(item.get("nota_c1")) if "nota_c1" in item else None
            val_c2 = _validar_nota_vigesimal(item.get("nota_c2")) if "nota_c2" in item else None
            val_c3 = _validar_nota_vigesimal(item.get("nota_c3")) if "nota_c3" in item else None
            val_final = _validar_nota_vigesimal(item.get("nota_final")) if "nota_final" in item else None

            rid = item.get("id") or item.get("registro_id")
            mid = item.get("matricula_detalle_id") or item.get("matricula_id")
            est_id = item.get("estudiante_id")

            db_obj = existing_by_id.get(rid) if rid else (existing_by_mat.get(mid) if mid else None)

            if not db_obj and rid and not mid:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Registro de evaluación {rid} no encontrado"
                )

            if not db_obj and mid:
                item_u = item.get("unidad_didactica_id") or item.get("unidad_id")
                item_p = item.get("periodo_id")
                if not item_u or not item_p:
                    md_info = await db.execute(
                        text("SELECT md.unidad_didactica_id, m.periodo_id FROM matricula_detalles md JOIN matriculas m ON md.matricula_id = m.id WHERE md.id = :mid"),
                        {"mid": mid}
                    )
                    md_row = md_info.fetchone()
                    if md_row:
                        item_u = item_u or md_row[0]
                        item_p = item_p or md_row[1]

                db_obj = RegistroEvaluacion(
                    matricula_detalle_id=mid,
                    estudiante_id=est_id,
                    unidad_didactica_id=item_u,
                    periodo_id=item_p
                )
                db.add(db_obj)
                existing_by_mat[mid] = db_obj

            if db_obj:
                if db_obj.estado in ["cerrado", "consolidado"]:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"El registro de evaluación se encuentra en estado '{db_obj.estado}'. No se permite modificar calificaciones."
                    )

                if "nota_c1" in item:
                    db_obj.nota_c1 = val_c1
                if "nota_c2" in item:
                    db_obj.nota_c2 = val_c2
                if "nota_c3" in item:
                    db_obj.nota_c3 = val_c3

                _aplicar_notas(db_obj, nota_final_solicitada=val_final)

                # CRÍTICO: Preservar la condición académica del estudiante (nunca 'cerrado')
                if db_obj.estado == "cerrado":
                    db_obj.estado = "aprobado" if (db_obj.nota_final is not None and db_obj.nota_final >= 13) else "desaprobado"

                actualizados.append(db_obj)

        await db.flush()

        req_id = request.headers.get("X-Request-ID", "unknown")
        for obj in actualizados:
            event = OutboxEvent(
                event_type="evaluacion.nota.actualizada",
                payload={
                    "registro_id": obj.id,
                    "matricula_detalle_id": obj.matricula_detalle_id,
                    "estudiante_id": obj.estudiante_id,
                    "nota_final": obj.nota_final,
                    "estado": obj.estado,
                    "metadata": {"request_id": req_id}
                }
            )
            db.add(event)

        await db.commit()
        return [RegistroEvaluacionResponse.model_validate(obj) for obj in actualizados]
    except Exception:
        await db.rollback()
        raise

@router.put("/registros/{registro_id}", response_model=RegistroEvaluacionResponse)
async def actualizar_notas(registro_id: int, data: RegistroEvaluacionUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    # 0. Verificación de Identidad (BUG-D02 / PASO 2)
    ident = await get_identity(request, db)

    result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.id == registro_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Registro de evaluación no encontrado")

    # Autorización por asignación de carga lectiva (403 antes que 409)
    if not es_superadmin(ident):
        carga_res = await db.execute(
            text("SELECT id, docente_id FROM carga_lectiva WHERE unidad_didactica_id = :u AND periodo_id = :p"),
            {"u": db_obj.unidad_didactica_id, "p": db_obj.periodo_id}
        )
        cargas = carga_res.fetchall()
        if not cargas:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La unidad no tiene docente asignado. Solicite la asignación de carga lectiva al coordinador."
            )
        if not any(c[1] == ident.user_id for c in cargas):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para esta operación"
            )

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
    """Ruta del Grupo 2 (Sincronización inter-módulos). Conservada intacta para evitar regresiones."""
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
# ENDPOINTS DE GESTIÓN Y CIERRE DE ACTAS DE EVALUACIÓN
# ==============================================================================

@router.get("/actas/unidad/{unidad_id}/periodo/{periodo_id}", response_model=EstadoActaUnidadResponse)
async def consultar_estado_acta_unidad(unidad_id: int, periodo_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Consulta el estado del acta y fecha límite de una unidad en un periodo (para el panel docente y coordinación)."""
    ident = await get_identity(request, db)
    await _validar_acceso_unidad(ident, unidad_id, periodo_id, db)

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
        text("SELECT id, acta_cerrada, fecha_limite_notas, acta_cerrada_at FROM carga_lectiva WHERE unidad_didactica_id = :u_id AND periodo_id = :p_id"),
        {"u_id": unidad_id, "p_id": periodo_id}
    )
    cargas = cargas_res.fetchall()

    if not cargas:
        if periodo_bloqueado:
            return EstadoActaUnidadResponse(
                tiene_carga=False,
                acta_cerrada=False,
                fecha_limite_notas=None,
                editable=False,
                motivo_bloqueo=f"El periodo académico {codigo_periodo} se encuentra en estado '{estado_periodo}'. Calificaciones bloqueadas.",
                acta_cerrada_at=None
            )
        return EstadoActaUnidadResponse(
            tiene_carga=False,
            acta_cerrada=False,
            fecha_limite_notas=None,
            editable=True,
            motivo_bloqueo=None,
            acta_cerrada_at=None
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

    acta_cerrada_at_max = None
    if acta_cerrada:
        fechas_cierre = [c[3] for c in cargas if c[3] is not None]
        acta_cerrada_at_max = max(fechas_cierre) if fechas_cierre else None

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
        motivo_bloqueo=motivo_bloqueo,
        acta_cerrada_at=acta_cerrada_at_max
    )

@router.get("/actas/periodo/{periodo_id}/programa/{programa_id}", response_model=ResumenActasProgramaResponse)
async def consultar_actas_programa_periodo(periodo_id: int, programa_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Resumen de actas para el coordinador: lista cargas lectivas, unidades sin carga y unidades solo pendientes."""
    ident = await get_identity(request, db)
    if not (es_superadmin(ident) or es_coordinador_de(ident, programa_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para esta operación"
        )

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
            ORDER BY cl.unidad_didactica_id;
        """),
        {"p_id": periodo_id, "prog_id": programa_id}
    )
    cargas_rows = cargas_res.fetchall()

    cargas_items = []
    cargas_u_ids = set()
    total_gral_pendientes = 0

    for c in cargas_rows:
        cid, uid, doc_id, f_lim, cerr, u_nom = c
        cargas_u_ids.add(uid)

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
            {"u_id": uid, "p_id": periodo_id}
        )
        s_row = stats_res.fetchone()
        tot = s_row[0] if s_row else 0
        con_n = s_row[1] if s_row else 0
        pend = s_row[2] if s_row else 0
        falt = max(0, tot - con_n)
        total_gral_pendientes += pend

        cargas_items.append(
            CargaActaItem(
                carga_id=cid,
                unidad_didactica_id=uid,
                unidad=u_nom,
                docente_id=doc_id,
                fecha_limite_notas=f_lim,
                acta_cerrada=bool(cerr),
                total_matriculas=tot,
                con_nota_final=con_n,
                faltantes=falt,
                matriculas_pendientes=pend
            )
        )

    # 2. Unidades con actividad en el periodo pero sin carga lectiva asignada
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
    unidades_solo_pendientes = []

    for u_id in otras_u_ids:
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

        pertenece_a_programa = bool(pu_row or up_row)
        if tot > 0:
            if pertenece_a_programa:
                unidades_sin_carga.append(item)
            else:
                unidades_sin_programa.append(item)
        elif pend > 0 and pertenece_a_programa:
            unidades_solo_pendientes.append(
                UnidadSoloPendientesItem(id=u_id, nombre=nombre_unidad, pendientes=pend)
            )

    return ResumenActasProgramaResponse(
        cargas=cargas_items,
        unidades_sin_carga=unidades_sin_carga,
        unidades_sin_programa=unidades_sin_programa,
        unidades_solo_pendientes=unidades_solo_pendientes,
        total_matriculas_pendientes=total_gral_pendientes
    )

@router.put("/actas/carga/{carga_id}/fecha-limite")
async def actualizar_fecha_limite_carga(carga_id: int, data: FechaLimiteRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Fija la fecha límite de ingreso de notas para una carga lectiva."""
    # 0. Verificación de Identidad y Autorización (403 antes que 409/422)
    ident = await get_identity(request, db)

    carga_res = await db.execute(
        text("SELECT id, periodo_id, programa_id, unidad_didactica_id, acta_cerrada, fecha_limite_notas FROM carga_lectiva WHERE id = :id FOR UPDATE"),
        {"id": carga_id}
    )
    carga = carga_res.fetchone()
    if not carga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga lectiva no encontrada.")

    carga_prog_id = carga[2]
    if carga_prog_id is None:
        carga_prog_id = await _obtener_programa_unidad_catalogo(db, carga[3])

    if not (es_superadmin(ident) or (carga_prog_id is not None and es_coordinador_de(ident, carga_prog_id))):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para esta operación"
        )

    hoy = get_hoy_lima()
    if data.fecha_limite_notas < hoy:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha límite debe ser igual o posterior a la fecha actual."
        )

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
            "user_id": ident.user_id,
            "timestamp": now_utc.isoformat(),
            "metadata": {"request_id": req_id, "user_id": ident.user_id}
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
    # 0. Verificación de Identidad y Autorización (403 antes que 409/422)
    ident = await get_identity(request, db)
    if not (es_superadmin(ident) or es_coordinador_de(ident, programa_id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para esta operación"
        )

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
            detail=f"No se puede modificar la fecha límite porque el periodo académico {cod_per} está cerrado."
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
            "cargas_afectadas": cargas_ids,
            "nueva_fecha_limite": str(data.fecha_limite_notas),
            "user_id": ident.user_id,
            "timestamp": now_utc.isoformat(),
            "metadata": {"request_id": req_id, "user_id": ident.user_id}
        }
    )
    db.add(event)
    await db.commit()

    return {
        "message": f"Se actualizó la fecha límite para {len(cargas_ids)} carga(s) lectiva(s) abiertas.",
        "actualizadas": len(cargas_ids),
        "fecha_limite_notas": data.fecha_limite_notas
    }

@router.post("/actas/carga/{carga_id}/cerrar", response_model=CerrarActaResponse)
async def cerrar_acta_carga(carga_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Cierra el acta de una carga lectiva verificando que todas las matrículas calificables tengan calificación final."""
    # 0. Verificación de Identidad y Autorización (403 antes que 409)
    ident = await get_identity(request, db)

    carga_res = await db.execute(
        text("SELECT id, periodo_id, programa_id, unidad_didactica_id, acta_cerrada FROM carga_lectiva WHERE id = :id FOR UPDATE"),
        {"id": carga_id}
    )
    carga = carga_res.fetchone()
    if not carga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga lectiva no encontrada.")

    carga_prog_id = carga[2]
    if carga_prog_id is None:
        carga_prog_id = await _obtener_programa_unidad_catalogo(db, carga[3])

    if not (es_superadmin(ident) or (carga_prog_id is not None and es_coordinador_de(ident, carga_prog_id))):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para esta operación"
        )

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

    # 4. Guardar acta cerrada en carga_lectiva con ident.user_id
    await db.execute(
        text("""
            UPDATE carga_lectiva 
            SET acta_cerrada = true, 
                acta_cerrada_at = :now, 
                acta_cerrada_por = :u_id, 
                updated_at = NOW() 
            WHERE id = :id
        """),
        {"now": now_db, "u_id": ident.user_id, "id": carga_id}
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
                "acta_cerrada_por": ident.user_id
            },
            "motivo": "Cierre regular de acta de evaluación",
            "user_id": ident.user_id,
            "timestamp": now_ts.isoformat(),
            "metadata": {"request_id": req_id, "user_id": ident.user_id}
        }
    )
    db.add(event)
    await db.commit()

    return CerrarActaResponse(
        message="Acta cerrada exitosamente",
        carga_id=carga_id,
        acta_cerrada=True,
        acta_cerrada_at=now_ts,
        acta_cerrada_por=ident.user_id,
        total_calificados=total_calificables,
        advertencia=advertencia
    )

@router.post("/actas/carga/{carga_id}/reabrir")
async def reabrir_acta_carga(carga_id: int, data: ReabrirActaRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Reabre un acta cerrada exigiendo motivo justificatorio y nueva fecha límite."""
    # 0. Verificación de Identidad y Autorización (403 antes que 409/422)
    ident = await get_identity(request, db)

    carga_res = await db.execute(
        text("SELECT id, periodo_id, programa_id, unidad_didactica_id, acta_cerrada, fecha_limite_notas, acta_cerrada_por FROM carga_lectiva WHERE id = :id FOR UPDATE"),
        {"id": carga_id}
    )
    carga = carga_res.fetchone()
    if not carga:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carga lectiva no encontrada.")

    carga_prog_id = carga[2]
    if carga_prog_id is None:
        carga_prog_id = await _obtener_programa_unidad_catalogo(db, carga[3])

    if not (es_superadmin(ident) or (carga_prog_id is not None and es_coordinador_de(ident, carga_prog_id))):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para esta operación"
        )

    if not carga[4]:  # no estaba cerrada
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El acta no se encuentra cerrada.")

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
            "user_id": ident.user_id,
            "timestamp": now_ts.isoformat(),
            "metadata": {"request_id": req_id, "user_id": ident.user_id}
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

