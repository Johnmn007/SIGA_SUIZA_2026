from fastapi import APIRouter, HTTPException, Depends, status, Request, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from database import get_db, OutboxEvent
from models import Estudiante, Matricula, MatriculaDetalle
from schemas import EstudianteCreate, EstudianteResponse, EstudianteUpdate, MatriculaCreate, MatriculaResponse, IngestaMasivaRequest
from datetime import datetime
from typing import List, Optional
from pathlib import Path
import uuid

router = APIRouter()

FOTO_DIR = Path(__file__).resolve().parent / "uploads" / "fotos"
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_FOTO_SIZE = 5 * 1024 * 1024  # 5 MB


def _foto_path_for(filename: str) -> Path:
    """Devuelve la ruta segura de un archivo de foto (previene path traversal)."""
    return FOTO_DIR / Path(filename).name


def _delete_foto(filename: str | None):
    """Elimina una foto del disco de forma best-effort."""
    if not filename:
        return
    file_name = Path(filename).name
    if not file_name:
        return
    try:
        _foto_path_for(file_name).unlink(missing_ok=True)
    except OSError:
        pass

@router.get("/fotos/{filename}")
async def obtener_foto(filename: str):
    """Sirve una foto de estudiante guardada en disco."""
    path = _foto_path_for(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    return FileResponse(path, media_type="image/jpeg")

@router.post("/estudiantes/{estudiante_id}/foto", response_model=EstudianteResponse)
async def subir_foto(estudiante_id: int, request: Request, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Sube o reemplaza la foto de un estudiante y guarda la URL en foto_url."""
    result = await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))
    db_estudiante = result.scalar_one_or_none()
    if not db_estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Formato de imagen inválido. Use JPG, PNG o WEBP")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    if len(content) > MAX_FOTO_SIZE:
        raise HTTPException(status_code=400, detail="La imagen supera los 5 MB")

    FOTO_DIR.mkdir(parents=True, exist_ok=True)
    ext = ALLOWED_IMAGE_TYPES[file.content_type]
    filename = f"{estudiante_id}_{uuid.uuid4().hex[:12]}{ext}"
    (FOTO_DIR / filename).write_bytes(content)

    if db_estudiante.foto_url:
        _delete_foto(db_estudiante.foto_url)
    db_estudiante.foto_url = f"/api/mod-gestion-academica/fotos/{filename}"

    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "gestion_academica.estudiante.foto_actualizada",
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

@router.delete("/estudiantes/{estudiante_id}/foto", response_model=EstudianteResponse)
async def eliminar_foto(estudiante_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Elimina la foto de un estudiante (foto_url vuelve a null)."""
    result = await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))
    db_estudiante = result.scalar_one_or_none()
    if not db_estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    if db_estudiante.foto_url:
        _delete_foto(db_estudiante.foto_url)
        db_estudiante.foto_url = None

    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "gestion_academica.estudiante.foto_eliminada",
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

METADATA_ADMISION_CAJA = {"S/. COSTO (S/. 250):", "Fecha de inscripcion:", "CODIGO", "MODALIDAD (EBR O EBA)"}

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
        return [{
            "id": r.id,
            "codigo_estudiante": r.codigo_estudiante,
            "dni": r.dni,
            "nombres": r.nombres,
            "apellidos": r.apellidos,
            "estado_academico": r.estado_academico,
            "programa_id": r.programa_id,
            "pago_matricula": bool(r.pago_matricula),
            "modalidad_admision": r.modalidad_admision,
            # Solo los campos de admisión que usa Caja (el listado no expone datos personales)
            "metadata_admision": {k: v for k, v in (r.metadata_admision or {}).items() if k in METADATA_ADMISION_CAJA},
        } for r in rows]
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[ERROR] obtener_estudiantes: {e}\n{tb}")
        return {"error": str(e), "type": type(e).__name__, "traceback": tb}

@router.put("/estudiantes/{estudiante_id}/pago_matricula", response_model=EstudianteResponse)
async def actualizar_pago_matricula(estudiante_id: int, request: Request, pagado: bool = True, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Estudiante).where(Estudiante.id == estudiante_id).with_for_update()
    )
    estudiante = result.scalar_one_or_none()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    if estudiante.pago_matricula == pagado:
        # Idempotente: el estado ya es el solicitado (reintento o doble envio).
        # No se modifica nada; el lock de fila se libera al cerrar la sesion.
        return estudiante

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

_ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

def _titulo_ciclo(numero):
    if numero is None:
        return 'CICLO'
    idx = int(numero) - 1
    return f"CICLO {_ROMANOS[idx]}" if 0 <= idx < len(_ROMANOS) else f"CICLO {numero}"

def _numero_ciclo(nombre_modulo, orden):
    import re
    if nombre_modulo:
        match = re.search(r'ciclo\s*(\d+)', str(nombre_modulo), re.IGNORECASE)
        if match:
            return int(match.group(1))
    return orden if orden is not None else 1

async def _construir_ciclos(db, estudiante_id, plan_id, periodo_id=None):
    """Documento historico: agrupa las unidades del plan por ciclo con la mejor nota del estudiante."""
    from sqlalchemy import text

    if not plan_id:
        return [], 0

    result_mod = await db.execute(
        text("SELECT id, nombre, orden FROM modulos_plan WHERE plan_id = :pid ORDER BY orden, id"),
        {"pid": plan_id}
    )
    modulos = result_mod.mappings().all()
    if not modulos:
        return [], 0

    modulo_ids = [m["id"] for m in modulos]
    placeholders = ','.join(f':m{i}' for i in range(len(modulo_ids)))
    result_uni = await db.execute(
        text(f"""
            SELECT id, modulo_id, nombre, codigo, creditos, horas, tipo, orden
            FROM unidades_plan
            WHERE modulo_id IN ({placeholders})
            ORDER BY modulo_id, orden, id
        """),
        {f'm{i}': mid for i, mid in enumerate(modulo_ids)}
    )
    unidades = result_uni.mappings().all()

    result_eval = await db.execute(
        text("""
            SELECT unidad_didactica_id, nota_c1, nota_c2, nota_c3, nota_final, estado, periodo_id
            FROM evaluacion_registros
            WHERE estudiante_id = :eid
              AND (nota_final IS NOT NULL OR nota_c1 IS NOT NULL OR nota_c2 IS NOT NULL OR nota_c3 IS NOT NULL)
        """),
        {"eid": estudiante_id}
    )
    evals = result_eval.mappings().all()

    result_per = await db.execute(text("SELECT id, codigo FROM periodos_academicos"))
    periodos = {p["id"]: p["codigo"] for p in result_per.mappings().all()}

    # Mejor registro por unidad: prioriza aprobado, luego nota mas alta, luego periodo mas reciente
    mejor = {}
    for e in evals:
        uid = e["unidad_didactica_id"]
        parciales = [n for n in (e["nota_c1"], e["nota_c2"], e["nota_c3"]) if n is not None]
        nota = e["nota_final"]
        if nota is None and parciales:
            nota = round(sum(parciales) / len(parciales))
        if nota is None:
            continue
        clave = (1 if e["estado"] == 'aprobado' else 0, nota, e["periodo_id"] or 0)
        actual = mejor.get(uid)
        if actual is None or clave > actual["_clave"]:
            mejor[uid] = {
                "nota": nota,
                "nota_c1": e["nota_c1"],
                "nota_c2": e["nota_c2"],
                "nota_c3": e["nota_c3"],
                "estado": e["estado"],
                "periodo_codigo": periodos.get(e["periodo_id"]),
                "_clave": clave,
            }

    # Docente por unidad (carga_lectiva): prefiere el periodo de la evaluacion, si no el vigente
    unidad_ids = [u["id"] for u in unidades]
    docentes_por_unidad = {}
    if unidad_ids:
        ph_ud = ','.join(f':u{i}' for i in range(len(unidad_ids)))
        result_cl = await db.execute(
            text(f"""
                SELECT cl.unidad_didactica_id, cl.periodo_id, cl.turno, cl.seccion, cu.full_name
                FROM carga_lectiva cl
                LEFT JOIN core_users cu ON cu.id = cl.docente_id
                WHERE cl.unidad_didactica_id IN ({ph_ud})
            """),
            {f'u{i}': uid for i, uid in enumerate(unidad_ids)}
        )
        for row in result_cl.mappings().all():
            uid = row["unidad_didactica_id"]
            opciones = docentes_por_unidad.setdefault(uid, [])
            opciones.append({
                "docente": row["full_name"],
                "turno": row["turno"],
                "seccion": row["seccion"],
                "periodo_id": row["periodo_id"],
            })

    unidades_por_modulo = {}
    for u in unidades:
        unidades_por_modulo.setdefault(u["modulo_id"], []).append(u)

    ciclos = {}
    for mod in modulos:
        num = _numero_ciclo(mod["nombre"], mod["orden"])
        ciclo = ciclos.setdefault(num, {"ciclo": num, "titulo": _titulo_ciclo(num), "unidades": []})
        for u in unidades_por_modulo.get(mod["id"], []):
            reg = mejor.get(u["id"])
            opciones = docentes_por_unidad.get(u["id"]) or []
            docente = None
            if opciones:
                periodo_eval = reg["_clave"][2] if reg else None
                docente = next((o for o in opciones if periodo_eval and o["periodo_id"] == periodo_eval), None)
                if docente is None and periodo_id:
                    docente = next((o for o in opciones if o["periodo_id"] == periodo_id), None)
                if docente is None:
                    docente = max(opciones, key=lambda o: o["periodo_id"] or 0)
            ciclo["unidades"].append({
                "nombre": u["nombre"],
                "codigo": u["codigo"],
                "creditos": u["creditos"],
                "horas": u["horas"],
                "tipo": u["tipo"],
                "nota": reg["nota"] if reg else None,
                "nota_c1": reg["nota_c1"] if reg else None,
                "nota_c2": reg["nota_c2"] if reg else None,
                "nota_c3": reg["nota_c3"] if reg else None,
                "estado": reg["estado"] if reg else "no_cursado",
                "periodo_codigo": reg["periodo_codigo"] if reg else None,
                "docente": docente["docente"] if docente else None,
                "turno": docente["turno"] if docente else None,
                "seccion": docente["seccion"] if docente else None,
            })

    salida = []
    for num in sorted(ciclos):
        c = ciclos[num]
        notas = [u["nota"] for u in c["unidades"] if u["nota"] is not None]
        c["promedio"] = round(sum(notas) / len(notas), 2) if notas else None
        c["creditos_ciclo"] = sum((u["creditos"] or 0) for u in c["unidades"])
        c["creditos_aprobados"] = sum((u["creditos"] or 0) for u in c["unidades"] if u["estado"] == 'aprobado')
        c["completado"] = len(c["unidades"]) > 0 and all(u["estado"] == 'aprobado' for u in c["unidades"])
        salida.append(c)

    return salida, len(salida)

async def _periodo_por_defecto_boletin(db, estudiante_id):
    """Periodo por defecto del boletin: ultima matricula del estudiante;
    si no tiene, el periodo vigente; si no, el mas reciente registrado."""
    from sqlalchemy import text

    result = await db.execute(
        text("""
            SELECT m.periodo_id
            FROM matriculas m
            JOIN periodos_academicos pa ON pa.id = m.periodo_id
            WHERE m.estudiante_id = :eid
            ORDER BY pa.fecha_inicio DESC NULLS LAST, m.id DESC
            LIMIT 1
        """),
        {"eid": estudiante_id},
    )
    periodo_id = result.scalars().first()
    if periodo_id:
        return periodo_id

    result = await db.execute(
        text("""
            SELECT id FROM periodos_academicos
            ORDER BY CASE estado WHEN 'en_curso' THEN 0 WHEN 'matricula_abierta' THEN 1 ELSE 2 END,
                     fecha_inicio DESC NULLS LAST, id DESC
            LIMIT 1
        """)
    )
    periodo_id = result.scalars().first()
    if periodo_id:
        return periodo_id

    raise HTTPException(status_code=404, detail="No hay periodos academicos registrados")

@router.get("/estudiantes/{estudiante_id}/boletin")
async def obtener_boletin(estudiante_id: int, periodo_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text

    result_est = await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))
    estudiante = result_est.scalar_one_or_none()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    if periodo_id is None:
        periodo_id = await _periodo_por_defecto_boletin(db, estudiante_id)

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
            SELECT p.creditos_totales, p.nombre as plan_nombre, p.nivel_formativo, pr.plan_estudio_id
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

    plan_estudio_id = plan_row["plan_estudio_id"] if plan_row else None
    ciclos, ciclos_totales = await _construir_ciclos(db, estudiante_id, plan_estudio_id, periodo_id)
    ciclos_completados = sum(1 for c in ciclos if c.get("completado"))

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
        "ciclos": ciclos,
        "resumen": {
            "promedio_general": promedio_periodo,
            "cursos_aprobados": aprobados,
            "cursos_desaprobados": desaprobados,
            "total_cursos": len(cursos_periodo),
            "ciclos_completados": ciclos_completados,
            "ciclos_totales": ciclos_totales,
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

ESTADOS_TRAMITE = {"pendiente", "en_proceso", "emitido", "rechazado", "aprobado"}

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
    if estado not in ESTADOS_TRAMITE:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Use: {', '.join(sorted(ESTADOS_TRAMITE))}")
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
    existente = await db.execute(select(ResolucionConvalidacion).where(ResolucionConvalidacion.numero_resolucion == data.numero_resolucion))
    if existente.scalars().first():
        raise HTTPException(status_code=409, detail="Ya existe una resolución con ese número")
    if not data.detalles:
        raise HTTPException(status_code=400, detail="Debe indicar al menos una unidad convalidada")
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

@router.get("/convalidaciones/", response_model=List[ResolucionConvalidacionResponse])
async def listar_convalidaciones(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ResolucionConvalidacion)
        .options(selectinload(ResolucionConvalidacion.detalles))
        .order_by(ResolucionConvalidacion.fecha_emision.desc(), ResolucionConvalidacion.id.desc())
    )
    return result.scalars().all()

@router.get("/convalidaciones/estudiante/{estudiante_id}", response_model=List[ResolucionConvalidacionResponse])
async def obtener_convalidaciones_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ResolucionConvalidacion).options(selectinload(ResolucionConvalidacion.detalles)).where(ResolucionConvalidacion.estudiante_id == estudiante_id))
    return result.scalars().all()

@router.post("/beneficios/", response_model=BeneficioEstudianteResponse, status_code=status.HTTP_201_CREATED)
async def registrar_beneficio(data: BeneficioEstudianteCreate, db: AsyncSession = Depends(get_db)):
    if not 0 < data.porcentaje_descuento <= 100:
        raise HTTPException(status_code=400, detail="El porcentaje de descuento debe estar entre 0 y 100")
    db_beneficio = BeneficioEstudiante(**data.model_dump())
    db.add(db_beneficio)
    await db.commit()
    await db.refresh(db_beneficio)
    return db_beneficio

@router.get("/beneficios/", response_model=List[BeneficioEstudianteResponse])
async def listar_beneficios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BeneficioEstudiante).order_by(BeneficioEstudiante.id.desc()))
    return result.scalars().all()

@router.put("/beneficios/{beneficio_id}/desactivar", response_model=BeneficioEstudianteResponse)
async def desactivar_beneficio(beneficio_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BeneficioEstudiante).where(BeneficioEstudiante.id == beneficio_id))
    db_beneficio = result.scalar_one_or_none()
    if not db_beneficio:
        raise HTTPException(status_code=404, detail="Beneficio no encontrado")
    db_beneficio.activo = False
    await db.commit()
    await db.refresh(db_beneficio)
    return db_beneficio

@router.get("/beneficios/estudiante/{estudiante_id}", response_model=List[BeneficioEstudianteResponse])
async def obtener_beneficios_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BeneficioEstudiante).where(BeneficioEstudiante.estudiante_id == estudiante_id, BeneficioEstudiante.activo == True))
    return result.scalars().all()

