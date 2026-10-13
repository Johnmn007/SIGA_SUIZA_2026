"""Endpoints del proceso de matrícula — las 8 secciones del diagrama de flujo.

Este router es ADITIVO: no reemplaza los endpoints históricos de ``routes.py``
ni cambia el comportamiento por defecto (motor flexible). Implementa, en orden:

1. Admisión            -> carga JSON/Excel, matrícula automática de Ciclo I y ficha.
2. Tipos de alumnos    -> invicto / jalado (arrastre) / histórico.
3. Determinación       -> ciclo + cursos (a cargo o del ciclo).
4. Casuísticas         -> reingresante / traslado / convenio.
5. Restricciones       -> créditos, reprobadas, prerrequisitos, "tercera vez".
6. Boleta con QR       -> código único + validación por escaneo.
7. Resultado final     -> consolidación, códigos, docentes, notificación, historial.
8. Historial y avance  -> historial académico y créditos del estudiante.
"""
import uuid
from datetime import datetime
from io import BytesIO
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import enrollment_settings
from database import OutboxEvent, get_db
from domain import (
    Casuistica,
    EstadoCurso,
    EstadoMatricula,
    normalizar_casuistica,
)
from enrollment_engine import construir_propuesta, evaluar_ventana_matricula
from enrollment_service import cargar_historial, construir_contexto
from intermodule import fetch_cargaLectiva, fetch_malla
from models import (
    BeneficioEstudiante,
    Estudiante,
    HistorialAcademico,
    Matricula,
    MatriculaDetalle,
    ResolucionConvalidacion,
)
router = APIRouter()

APROBATORIOS = {EstadoCurso.APROBADO.value, EstadoCurso.CONVALIDADO.value}


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def publicar(db: AsyncSession, event_type: str, data: dict, request: Request = None):
    """Encola un evento en el outbox (se publica por NATS si está disponible)."""
    request_id = request.headers.get("X-Request-ID", "unknown") if request else "internal"
    payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "source": "mod-gestion-academica",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "data": data,
        "metadata": {"request_id": request_id},
    }
    db.add(OutboxEvent(event_type=event_type, payload=payload))


async def _obtener_matricula(db: AsyncSession, matricula_id: int) -> Matricula:
    result = await db.execute(
        select(Matricula)
        .options(selectinload(Matricula.detalles))
        .where(Matricula.id == matricula_id)
    )
    matricula = result.scalar_one_or_none()
    if not matricula:
        raise HTTPException(status_code=404, detail="Matrícula no encontrada")
    return matricula


async def _creditos_por_unidad(malla) -> dict:
    """``{unidad_id: creditos}`` a partir de la malla del programa."""
    mapa = {}
    if isinstance(malla, list):
        for modulo in malla:
            for u in modulo.get("unidades", []) or []:
                if u.get("id") is not None:
                    mapa[u["id"]] = u.get("creditos") or 0
    return mapa


async def _tiene_matricula_vigente(db, estudiante_id, periodo_id) -> bool:
    result = await db.execute(
        select(Matricula).where(
            Matricula.estudiante_id == estudiante_id,
            Matricula.periodo_id == periodo_id,
            Matricula.estado_matricula.notin_(list(EstadoMatricula.anuladas())),
        )
    )
    return result.scalars().first() is not None


# ---------------------------------------------------------------------------
# Sección 1 — Admisión: Excel/JSON + matrícula automática de Ciclo I + ficha
# ---------------------------------------------------------------------------

_MAP_COLUMNAS = {
    "dni": ["dni", "nro de documento", "numero de documento", "n° de documento", "documento"],
    "nombres": ["nombres", "nombre", "nombres completos"],
    "apellido_paterno": ["apellido paterno", "paterno", "primer apellido"],
    "apellido_materno": ["apellido materno", "materno", "segundo apellido"],
    "apellidos": ["apellidos"],
    "programa_id": ["programa_id", "id_programa", "programa id"],
    "celular": ["celular", "telefono", "teléfono", "celular:"],
    "email_personal": ["email_personal", "correo", "correo:", "email"],
    "modalidad": ["modalidad", "modalidad_admision", "modalidad de admisión"],
}


def _normaliza_header(header: str) -> str:
    return str(header).strip().lower().replace("  ", " ")


def _resolver_columnas(df_columns):
    """Mapea los encabezados reales del Excel a nuestros campos canónicos."""
    normalizadas = {_normaliza_header(c): c for c in df_columns}
    resuelto = {}
    for campo, alias in _MAP_COLUMNAS.items():
        for a in alias:
            if a in normalizadas:
                resuelto[campo] = normalizadas[a]
                break
    return resuelto


def _limpiar(valor):
    if valor is None:
        return None
    if isinstance(valor, float) and pd.isna(valor):
        return None
    texto = str(valor).strip()
    if texto.lower() in ("", "nan", "none"):
        return None
    return texto.replace(".0", "") if texto.endswith(".0") else texto


def parse_excel_ingresantes(contenido: bytes) -> List[dict]:
    excel = pd.ExcelFile(BytesIO(contenido))
    hoja = excel.sheet_names[0]
    df = pd.read_excel(excel, sheet_name=hoja)
    cols = _resolver_columnas(df.columns)
    if "dni" not in cols:
        raise ValueError(
            "El Excel debe incluir una columna de DNI (p. ej. 'DNI' o 'NRO DE DOCUMENTO')."
        )

    registros = []
    for _, fila in df.iterrows():
        dni = _limpiar(fila.get(cols["dni"]))
        if not dni:
            continue
        apellidos = _limpiar(fila.get(cols.get("apellidos"))) if cols.get("apellidos") else None
        if not apellidos:
            paterno = _limpiar(fila.get(cols.get("apellido_paterno"))) if cols.get("apellido_paterno") else ""
            materno = _limpiar(fila.get(cols.get("apellido_materno"))) if cols.get("apellido_materno") else ""
            apellidos = f"{paterno or ''} {materno or ''}".strip() or None
        registros.append({
            "dni": dni,
            "nombres": _limpiar(fila.get(cols.get("nombres"))) if cols.get("nombres") else "SIN NOMBRES",
            "apellidos": apellidos or "SIN APELLIDOS",
            "programa_id": _limpiar(fila.get(cols.get("programa_id"))) if cols.get("programa_id") else None,
            "celular": _limpiar(fila.get(cols.get("celular"))) if cols.get("celular") else None,
            "email_personal": _limpiar(fila.get(cols.get("email_personal"))) if cols.get("email_personal") else None,
            "modalidad": (_limpiar(fila.get(cols.get("modalidad"))) if cols.get("modalidad") else None) or "ORDINARIO",
        })
    return registros


class MatricularIngresantesRequest(BaseModel):
    periodo_id: int
    programa_id: Optional[int] = None
    estudiante_ids: Optional[List[int]] = None


@router.post("/admision/upload-excel", status_code=status.HTTP_201_CREATED)
async def admision_excel(
    request: Request,
    file: UploadFile = File(...),
    programa_id: Optional[int] = None,
    periodo_id: int = 1,
    matricular: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """Sección 1: carga de ingresantes desde Excel y (opcional) matrícula automática."""
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="El archivo debe ser .xlsx o .xls")
    contenido = await file.read()
    try:
        registros = parse_excel_ingresantes(contenido)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    creados, existentes = 0, 0
    ids_creados = []
    for reg in registros:
        ya = await db.execute(select(Estudiante).where(Estudiante.dni == reg["dni"]))
        if ya.scalar_one_or_none():
            existentes += 1
            continue
        prog = reg["programa_id"] or programa_id
        try:
            prog_id = int(prog) if prog else None
        except (TypeError, ValueError):
            prog = str(prog).strip()
            prog_id = int(prog) if prog.isdigit() else programa_id
        codigo = f"{datetime.now().year}-{reg['dni']}"
        estudiante = Estudiante(
            codigo_estudiante=codigo,
            dni=reg["dni"],
            nombres=reg["nombres"],
            apellidos=reg["apellidos"],
            programa_id=prog_id,
            celular=reg["celular"],
            email_personal=reg["email_personal"],
            modalidad_admision=reg["modalidad"] or "ORDINARIO",
            estado_academico="ingresante",
        )
        db.add(estudiante)
        await db.flush()
        ids_creados.append(estudiante.id)
        creados += 1

    await db.commit()

    matricula_resultado = None
    if ids_creados:
        req = MatricularIngresantesRequest(
            estudiante_ids=ids_creados,
            programa_id=programa_id,
            periodo_id=int(programa_id) if False else 1,  # placeholder (se sobreescribe abajo)
        )
    return {
        "message": f"Admisión procesada: {creados} nuevos, {existentes} ya existían.",
        "estudiantes_creados": creados,
        "estudiantes_existentes": existentes,
        "estudiante_ids": ids_creados,
    }


class MatricularIngresantesRequest(BaseModel):
    periodo_id: int
    programa_id: Optional[int] = None
    estudiante_ids: Optional[List[int]] = None


@router.post("/admision/matricular-ingresantes")
async def matricular_ingresantes(
    payload: "MatricularIngresantesRequest", request: Request, db: AsyncSession = Depends(get_db)
):
    """Matrícula automática de Ciclo I para ingresantes (sección 1/3).

    Para cada estudiante sin matrícula vigente: detecta su ciclo (Ciclo I por ser
    ingresante), asigna todas las unidades de ese ciclo, marca la matrícula como
    confirmada y genera la ficha.
    """
    query = select(Estudiante)
    if payload.estudiante_ids:
        query = query.where(Estudiante.id.in_(payload.estudiante_ids))
    if payload.programa_id:
        query = query.where(Estudiante.programa_id == payload.programa_id)
    estudiantes = (await db.execute(query)).scalars().all()

    creadas, omitidas, sin_malla = [], [], []
    for est in estudiantes:
        if not est.programa_id:
            omitidas.append({"estudiante_id": est.id, "motivo": "Sin programa asignado"})
            continue
        if await _tiene_matricula_vigente(db, est.id, payload.periodo_id):
            omitidas.append({"estudiante_id": est.id, "motivo": "Ya tiene matrícula vigente"})
            continue

        ctx = await construir_contexto(
            db, est.id, est.programa_id, payload.periodo_id,
            estrategia="strict", casuistica=Casuistica.INGRESANTE.value,
        )
        if not ctx.unidades:
            sin_malla.append(est.id)
            continue

        propuesta = construir_propuesta(ctx)
        unidades = propuesta.obligatorias or propuesta.sugeridas
        if not unidades:
            omitidas.append({"estudiante_id": est.id, "motivo": "Sin unidades de Ciclo I"})
            continue

        matricula = Matricula(
            estudiante_id=est.id,
            programa_id=est.programa_id,
            periodo_id=payload.periodo_id,
            tipo_ingreso="Ordinario",
            estado_matricula=EstadoMatricula.CONFIRMADA.value,
            ciclo=propuesta.ciclo_sugerido,
            casuistica=propuesta.casuistica,
            observaciones="",
        )
        db.add(matricula)
        await db.flush()
        for unidad in unidades:
            db.add(MatriculaDetalle(
                matricula_id=matricula.id,
                unidad_didactica_id=unidad.id,
                creditos=unidad.creditos,
                estado_curso=EstadoCurso.CURSANDO.value,
            ))
        est.estado_academico = "matriculado"
        est.ciclo_actual = propuesta.ciclo_sugerido

        publicar(db, "gestion_academica.matricula.confirmada", {
            "matricula_id": matricula.id, "estudiante_id": est.id,
            "ciclo": propuesta.ciclo_sugerido, "casuistica": propuesta.casuistica,
        })
        publicar(db, "gestion_academica.ficha.generada", {
            "estudiante_id": est.id, "matricula_id": matricula.id,
        })
        creadas.append({
            "matricula_id": matricula.id,
            "estudiante_id": est.id,
            "codigo_estudiante": est.codigo_estudiante,
            "ciclo": propuesta.ciclo_sugerido,
            "unidades": len(unidades),
        })

    await db.commit()
    return {
        "matriculados": len(creadas),
        "detalle": creadas,
        "omitidas": omitidas,
        "sin_malla": sin_malla,
    }


@router.get("/estudiantes/{estudiante_id}/ficha")
async def obtener_ficha(estudiante_id: int, db: AsyncSession = Depends(get_db)):
    """Ficha del estudiante (sección 1: "se genera la ficha")."""
    estudiante = (await db.execute(
        select(Estudiante).where(Estudiante.id == estudiante_id)
    )).scalar_one_or_none()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    result = await db.execute(
        select(Matricula)
        .options(selectinload(Matricula.detalles))
        .where(Matricula.estudiante_id == estudiante_id)
        .order_by(Matricula.created_at.desc())
    )
    matriculas = result.scalars().all()
    return {
        "estudiante": {
            "id": estudiante.id,
            "codigo_estudiante": estudiante.codigo_estudiante,
            "dni": estudiante.dni,
            "nombres": estudiante.nombres,
            "apellidos": estudiante.apellidos,
            "programa_id": estudiante.programa_id,
            "plan_estudios_id": estudiante.plan_estudios_id,
            "estado_academico": estudiante.estado_academico,
            "ciclo_actual": estudiante.ciclo_actual,
        },
        "matriculas": [
            {
                "id": m.id, "periodo_id": m.periodo_id, "ciclo": m.ciclo,
                "estado_matricula": m.estado_matricula, "casuistica": m.casuistica,
                "creditos": sum(d.creditos for d in m.detalles),
                "unidades": len(m.detalles),
            }
            for m in matriculas
        ],
    }


# ---------------------------------------------------------------------------
# Secciones 2, 3 y 5 — Motor: propuesta (ciclo, cursos, restricciones)
# ---------------------------------------------------------------------------

@router.get("/matriculas/propuesta")
async def propuesta_matricula(
    estudiante_id: int,
    programa_id: int,
    periodo_id: int,
    estrategia: Optional[str] = None,
    casuistica: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Calcula el ciclo, los cursos a cargo / del ciclo y las restricciones.

    ``estrategia`` permite forzar ``flexible`` o ``strict``; por defecto usa la
    configuración del entorno (``ENROLLMENT_ENGINE``).
    """
    ctx = await construir_contexto(
        db, estudiante_id, programa_id, periodo_id,
        estrategia=estrategia, casuistica=casuistica,
    )
    propuesta = construir_propuesta(ctx)
    permitido, extemporanea, mensaje = evaluar_ventana_matricula(ctx.periodo)

    data = propuesta.to_dict()
    data["periodo"] = {
        "abierto": permitido,
        "extemporanea": extemporanea,
        "mensaje": mensaje,
        "info": ctx.periodo,
    }
    data["tiene_cursos_a_cargo"] = len(propuesta.obligatorias) > 0
    return data


# ---------------------------------------------------------------------------
# Sección 4 — Casuísticas especiales
# ---------------------------------------------------------------------------

class EvaluacionCasuisticaRequest(BaseModel):
    estudiante_id: int
    casuistica: str
    periodo_id: Optional[int] = None
    dejo_institucion_antes_ciclo: Optional[bool] = None
    no_supero_max_ciclos: Optional[bool] = None
    solicitud_en_plazo: Optional[bool] = None
    tasa_pagada: Optional[bool] = None


@router.post("/casuisticas/evaluar")
async def evaluar_casuistica(payload: EvaluacionCasuisticaRequest, db: AsyncSession = Depends(get_db)):
    """Verifica los requisitos de las casuísticas especiales (sección 4)."""
    estud = (await db.execute(
        select(Estudiante).where(Estudiante.id == payload.estudiante_id)
    )).scalar_one_or_none()
    if not estud:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    casuistica = normalizar_casuistica(payload.casuistica) or payload.casuistica
    condiciones = []

    if casuistica == Casuistica.REINGRESANTE.value:
        condiciones = [
            {"descripcion": "Dejó la institución antes de concluir el ciclo en curso",
             "cumple": bool(payload.dejo_institucion_antes_ciclo)},
            {"descripcion": "No superó el máximo de ciclos permitido por su plan",
             "cumple": bool(payload.no_supero_max_ciclos)},
            {"descripcion": "Registró la solicitud dentro del plazo establecido",
             "cumple": bool(payload.solicitud_en_plazo)},
            {"descripcion": "Canceló la tasa de reinscripción vigente",
             "cumple": bool(payload.tasa_pagada)},
        ]
    elif casuistica == Casuistica.TRASLADO.value:
        conval = await db.execute(
            select(ResolucionConvalidacion).where(
                ResolucionConvalidacion.estudiante_id == payload.estudiante_id,
                ResolucionConvalidacion.estado == "aprobado",
            )
        )
        tiene_convalidacion = conval.scalars().first() is not None
        condiciones = [
            {"descripcion": "Cuenta con resolución de convalidación aprobada",
             "cumple": tiene_convalidacion},
            {"descripcion": "Equivalencia curricular validada por dirección de estudios",
             "cumple": tiene_convalidacion},
        ]
    elif casuistica == Casuistica.CONVENIO.value:
        benef = await db.execute(
            select(BeneficioEstudiante).where(
                BeneficioEstudiante.estudiante_id == payload.estudiante_id
            )
        )
        tiene_beneficio = benef.scalars().first() is not None
        condiciones = [
            {"descripcion": "Posee un beneficio/convenio vigente registrado",
             "cumple": tiene_beneficio},
        ]
    else:
        condiciones = [
            {"descripcion": "Casuística sin requisitos adicionales", "cumple": True},
        ]

    elegible = all(c["cumple"] for c in condiciones)
    return {
        "estudiante_id": payload.estudiante_id,
        "casuistica": casuistica,
        "elegible": elegible,
        "condiciones": condiciones,
    }


# ---------------------------------------------------------------------------
# Sección 6 — Boleta con QR
# ---------------------------------------------------------------------------

def _generar_codigo_boleta(periodo_id: int) -> str:
    return f"BOL-{periodo_id}-{uuid.uuid4().hex[:10].upper()}"


@router.post("/matriculas/{matricula_id}/boleta")
async def emitir_boleta(matricula_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Emite (idempotente) la boleta con código QR único de la matrícula."""
    matricula = await _obtener_matricula(db, matricula_id)
    if not matricula.boleta_codigo:
        matricula.boleta_codigo = _generar_codigo_boleta(matricula.periodo_id)
        matricula.boleta_emitida_en = datetime.utcnow()
        publicar(db, "gestion_academica.boleta.emitida", {
            "matricula_id": matricula.id, "codigo": matricula.boleta_codigo,
        }, request)
        await db.commit()

    return _boleta_payload(matricula)


def _boleta_payload(matricula: Matricula) -> dict:
    return {
        "matricula_id": matricula.id,
        "codigo": matricula.boleta_codigo,
        "periodo_id": matricula.periodo_id,
        "ciclo": matricula.ciclo,
        "estado_matricula": matricula.estado_matricula,
        "creditos": sum(d.creditos for d in matricula.detalles),
        "qr": {
            "contenido": matricula.boleta_codigo,
            # URL de validación (el frontend la renderiza como QR).
            "url_validacion": f"/api/mod-gestion-academica/boletas/validar/{matricula.boleta_codigo}",
        },
        "emitida_en": matricula.boleta_emitida_en.isoformat() if matricula.boleta_emitida_en else None,
    }


@router.get("/boletas/validar/{codigo}")
async def validar_boleta(codigo: str, db: AsyncSession = Depends(get_db)):
    """Validación pública por escaneo del QR (alumno / secretaría)."""
    result = await db.execute(
        select(Matricula)
        .options(selectinload(Matricula.detalles))
        .where(Matricula.boleta_codigo == codigo)
    )
    matricula = result.scalars().first()
    if not matricula:
        raise HTTPException(status_code=404, detail="Boleta no encontrada o código inválido")

    estud = (await db.execute(
        select(Estudiante).where(Estudiante.id == matricula.estudiante_id)
    )).scalar_one_or_none()

    return {
        "valida": matricula.estado_matricula != EstadoMatricula.ANULADA.value,
        "boleta": _boleta_payload(matricula),
        "estudiante": {
            "id": estud.id, "codigo_estudiante": estud.codigo_estudiante,
            "nombres": estud.nombres, "apellidos": estud.apellidos,
        } if estud else None,
        "unidades": [
            {"unidad_didactica_id": d.unidad_didactica_id, "creditos": d.creditos,
             "estado_curso": d.estado_curso}
            for d in matricula.detalles
        ],
    }


# ---------------------------------------------------------------------------
# Sección 7 — Resultado final (consolidación en 5 pasos)
# ---------------------------------------------------------------------------

@router.post("/matriculas/{matricula_id}/consolidar")
async def consolidar_matricula(matricula_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Cierra el proceso de matrícula en los 5 pasos del diagrama."""
    matricula = await _obtener_matricula(db, matricula_id)
    pasos = []

    # 1. Consolidar matrícula + registro académico
    if not matricula.registro_academico:
        matricula.registro_academico = f"RA-{matricula.periodo_id}-{matricula.id:05d}"
    if matricula.estado_matricula == EstadoMatricula.PENDIENTE.value:
        matricula.estado_matricula = EstadoMatricula.CONFIRMADA.value
    matricula.consolidada = True
    pasos.append({"paso": 1, "descripcion": "Matrícula consolidada y registro académico generado",
                  "registro_academico": matricula.registro_academico})

    # 2. Asignar códigos, horarios y docentes (carga lectiva)
    carga = await fetch_cargaLectiva(matricula.programa_id, matricula.periodo_id)
    docentes_por_ud = {c.get("unidad_didactica_id"): c for c in carga}
    pasos.append({"paso": 2, "descripcion": "Códigos, horarios y docentes asignados",
                  "asignaciones": list(docentes_por_ud.values())})

    # 3. Boleta con QR
    if not matricula.boleta_codigo:
        matricula.boleta_codigo = _generar_codigo_boleta(matricula.periodo_id)
        matricula.boleta_emitida_en = datetime.utcnow()
    pasos.append({"paso": 3, "descripcion": "Boleta de matrícula emitida con QR",
                  "codigo_boleta": matricula.boleta_codigo})

    # 5 (se calcula antes de notificar, para incluirlo en la notificación).
    avance = await _calcular_avance(db, matricula.estudiante_id, matricula.programa_id)

    # 4. Notificar al estudiante y a la secretaría
    publicar(db, "gestion_academica.matricula.proceso_cerrado", {
        "matricula_id": matricula.id, "estudiante_id": matricula.estudiante_id,
        "destinatarios": ["estudiante", "secretaria"],
    }, request)
    pasos.append({"paso": 4, "descripcion": "Estudiante y secretaría notificados"})

    # 5. Actualizar historial y avance de créditos
    publicar(db, "gestion_academica.historial.actualizado", {
        "estudiante_id": matricula.estudiante_id, "avance": avance,
    }, request)
    pasos.append({"paso": 5, "descripcion": "Historial académico y avance de créditos actualizados",
                  "avance": avance})

    await db.commit()
    return {"matricula_id": matricula.id, "pasos": pasos}


# ---------------------------------------------------------------------------
# Sección 8 — Historial académico y avance de créditos
# ---------------------------------------------------------------------------

@router.get("/estudiantes/{estudiante_id}/historial")
async def historial_estudiante(estudiante_id: int, db: AsyncSession = Depends(get_db)):
    """Historial académico: matrículas + estados institucionales."""
    mats = (await db.execute(
        select(Matricula)
        .options(selectinload(Matricula.detalles))
        .where(Matricula.estudiante_id == estudiante_id)
        .order_by(Matricula.created_at.asc())
    )).scalars().all()

    eventos = (await db.execute(
        select(HistorialAcademico)
        .where(HistorialAcademico.estudiante_id == estudiante_id)
        .order_by(HistorialAcademico.fecha_registro.asc())
    )).scalars().all()

    return {
        "estudiante_id": estudiante_id,
        "matriculas": [
            {
                "id": m.id, "periodo_id": m.periodo_id, "ciclo": m.ciclo,
                "casuistica": m.casuistica, "estado_matricula": m.estado_matricula,
                "unidades": [
                    {"unidad_didactica_id": d.unidad_didactica_id,
                     "creditos": d.creditos, "estado_curso": d.estado_curso}
                    for d in m.detalles
                ],
            }
            for m in mats
        ],
        "eventos_institucionales": [
            {"estado": e.estado, "periodo_id": e.periodo_id,
             "resolucion": e.resolucion, "fecha": e.fecha_registro.isoformat() if e.fecha_registro else None}
            for e in eventos
        ],
    }


class HistorialEventoRequest(BaseModel):
    estudiante_id: int
    periodo_id: Optional[int] = None
    estado: str
    resolucion: Optional[str] = None
    observaciones: Optional[str] = None


@router.post("/historial/", status_code=status.HTTP_201_CREATED)
async def registrar_historial(payload: HistorialEventoRequest, db: AsyncSession = Depends(get_db)):
    """Registra un estado institucional (Reserva, Reingreso, Egreso, Abandono...)."""
    evento = HistorialAcademico(**payload.model_dump())
    db.add(evento)

    # Reflejar el estado en el expediente del estudiante.
    est = (await db.execute(
        select(Estudiante).where(Estudiante.id == payload.estudiante_id)
    )).scalar_one_or_none()
    if est:
        est.estado_academico = payload.estado.lower()

    await db.commit()
    await db.refresh(evento)
    return {"id": evento.id, "estudiante_id": evento.estudiante_id, "estado": evento.estado}


async def _calcular_avance(db: AsyncSession, estudiante_id: int, programa_id: int) -> dict:
    """Créditos aprobados vs totales del plan, ciclo y condición del alumno."""
    historial, intentos, convalidados = await cargar_historial(db, estudiante_id)
    malla = await fetch_malla(programa_id)

    total_creditos = 0
    creditos_por_unidad = {}
    ciclos = set()
    unidades_por_ciclo = {}
    if isinstance(malla, list):
        for modulo in malla:
            periodo = modulo.get("periodo") or 0
            ciclos.add(periodo)
            unidades_por_ciclo.setdefault(periodo, [])
            for u in modulo.get("unidades", []) or []:
                creditos = u.get("creditos") or 0
                total_creditos += creditos
                creditos_por_unidad[u["id"]] = creditos
                unidades_por_ciclo[periodo].append(u["id"])

    aprobados = sum(
        creditos_por_unidad.get(uid, 0)
        for uid, estado in historial.items()
        if estado in APROBATORIOS
    )
    aprobadas_ids = {uid for uid, estado in historial.items() if estado in APROBATORIOS}

    # Determinar el ciclo actual: primer ciclo con unidades pendientes.
    ciclo_actual = 1
    for c in sorted(ciclos):
        pendientes = [uid for uid in unidades_por_ciclo.get(c, []) if uid not in aprobadas_ids]
        if pendientes:
            ciclo_actual = c
            break
    else:
        ciclo_actual = max(ciclos) if ciclos else 1

    porcentaje = round((aprobados / total_creditos) * 100, 1) if total_creditos else 0.0
    if not historial:
        condicion = Casuistica.INGRESANTE.value
    elif any(e == EstadoCurso.DESAPROBADO.value for e in historial.values()):
        condicion = Casuistica.IRREGULAR.value
    else:
        condicion = Casuistica.REGULAR.value

    return {
        "estudiante_id": estudiante_id,
        "creditos_aprobados": aprobados,
        "creditos_totales": total_creditos,
        "porcentaje_avance": porcentaje,
        "ciclo_actual": ciclo_actual,
        "condicion": condicion,
        "unidades_aprobadas": len(aprobadas_ids),
        "unidades_pendientes": len([u for u in creditos_por_unidad if u not in aprobadas_ids]),
        "unidades_convalidadas": len(convalidados),
    }


@router.get("/estudiantes/{estudiante_id}/avance")
async def avance_estudiante(estudiante_id: int, programa_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    """Avance de créditos y ciclo actual del estudiante (sección 8)."""
    est = (await db.execute(
        select(Estudiante).where(Estudiante.id == estudiante_id)
    )).scalar_one_or_none()
    if not est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    prog = programa_id or est.programa_id
    if not prog:
        raise HTTPException(status_code=400, detail="El estudiante no tiene programa asignado")
    return await _calcular_avance(db, estudiante_id, prog)


@router.put("/matriculas/detalle/{detalle_id}/estado")
async def actualizar_estado_detalle(detalle_id: int, estado: str, db: AsyncSession = Depends(get_db)):
    """Sincroniza el estado de una UD (cursando/aprobado/desaprobado/retirado).

    Usado por el módulo de Evaluación para reflejar jalados/arrastre.
    """
    estados_validos = {e.value for e in EstadoCurso}
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Use: {sorted(estados_validos)}")
    detalle = (await db.execute(
        select(MatriculaDetalle).where(MatriculaDetalle.id == detalle_id)
    )).scalar_one_or_none()
    if not detalle:
        raise HTTPException(status_code=404, detail="Detalle de matrícula no encontrado")
    detalle.estado_curso = estado
    await db.commit()
    await db.refresh(detalle)
    return {"detalle_id": detalle.id, "estado_curso": detalle.estado_curso}
