"""Orquestación del motor de matrícula.

Arma el :class:`Contexto` que consume el motor puro
(``enrollment_engine.py``), leyendo el historial desde la propia BD y la malla
desde ``mod-programas-estudio``.
"""
import logging
from typing import Dict, List, Set, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import intermodule
from config import enrollment_settings
from domain import (
    Casuistica,
    EstadoCurso,
    EstadoMatricula,
    clasificar_casuistica,
    normalizar_casuistica,
)
from enrollment_engine import Contexto, Unidad
from models import (
    ConvalidacionDetalle,
    Estudiante,
    Matricula,
    MatriculaDetalle,
    ResolucionConvalidacion,
)

logger = logging.getLogger(__name__)


async def cargar_historial(db: AsyncSession, estudiante_id: int) -> Tuple[Dict[int, str], Dict[int, int], Set[int]]:
    """Recupera el historial académico del estudiante desde sus matrículas.

    Devuelve ``(historial, intentos, convalidados)``:

    * ``historial``: ``{unidad_id: estado}`` (estado de la última vez cursada).
    * ``intentos``: ``{unidad_id: nro de veces cursada}``.
    * ``convalidados``: conjunto de ``unidad_id`` reconocidos por convalidación.
    """
    historial: Dict[int, str] = {}
    intentos: Dict[int, int] = {}

    result = await db.execute(
        select(Matricula, MatriculaDetalle.estado_curso, MatriculaDetalle.unidad_didactica_id)
        .join(MatriculaDetalle, MatriculaDetalle.matricula_id == Matricula.id)
        .where(Matricula.estudiante_id == estudiante_id)
        .where(Matricula.estado_matricula.notin_(list(EstadoMatricula.anuladas())))
        .order_by(Matricula.created_at.asc())
    )
    for _matricula, estado_curso, unidad_id in result.all():
        intentos[unidad_id] = intentos.get(unidad_id, 0) + 1
        historial[unidad_id] = estado_curso or EstadoCurso.CURSANDO.value

    convalidados: Set[int] = set()
    result = await db.execute(
        select(ConvalidacionDetalle.unidad_destino_id)
        .join(ResolucionConvalidacion, ResolucionConvalidacion.id == ConvalidacionDetalle.resolucion_id)
        .where(ResolucionConvalidacion.estudiante_id == estudiante_id)
        .where(ResolucionConvalidacion.estado == "aprobado")
    )
    for (unidad_id,) in result.all():
        if unidad_id is not None:
            convalidados.add(unidad_id)
            historial[unidad_id] = EstadoCurso.CONVALIDADO.value

    return historial, intentos, convalidados


def _flatten_malla(malla, prereqs: Dict[int, List[int]]) -> List[Unidad]:
    """Convierte la malla de mod-programas-estudio en unidades normalizadas."""
    unidades: List[Unidad] = []
    if not isinstance(malla, list):
        return unidades
    for modulo in malla:
        periodo = modulo.get("periodo") or 0
        for unidad in modulo.get("unidades", []) or []:
            unidad_id = unidad.get("id")
            if unidad_id is None:
                continue
            unidades.append(
                Unidad(
                    id=unidad_id,
                    nombre=unidad.get("nombre", ""),
                    creditos=unidad.get("creditos") or 0,
                    periodo=periodo,
                    prerequisitos=prereqs.get(unidad_id, []),
                )
            )
    return unidades


def _deducir_casuistica(estudiante, historial, convalidados, override) -> str:
    """Prioriza: override explícito > modalidad del estudiante > historial."""
    if override:
        normalizada = normalizar_casuistica(override)
        if normalizada:
            return normalizada

    modalidad = (getattr(estudiante, "modalidad_admision", "") or "").upper()
    if "TRASLADO" in modalidad:
        return Casuistica.TRASLADO.value
    if "CONVENIO" in modalidad or "BECA" in modalidad:
        return Casuistica.CONVENIO.value

    return clasificar_casuistica(historial, convalidados)


async def construir_contexto(
    db: AsyncSession,
    estudiante_id: int,
    programa_id: int,
    periodo_id: int,
    estrategia: str = None,
    casuistica: str = None,
) -> Contexto:
    """Reúne toda la información y devuelve el contexto listo para el motor."""
    estudiante = (
        await db.execute(select(Estudiante).where(Estudiante.id == estudiante_id))
    ).scalar_one_or_none()

    historial, intentos, convalidados = await cargar_historial(db, estudiante_id)

    malla = await intermodule.fetch_malla(programa_id)
    prereqs = await intermodule.fetch_prerequisitos(programa_id)
    unidades = _flatten_malla(malla, prereqs)

    periodo = await intermodule.fetch_periodo(periodo_id)

    return Contexto(
        mode=enrollment_settings.engine_for(estrategia),
        casuistica=_deducir_casuistica(estudiante, historial, convalidados, casuistica),
        unidades=unidades,
        historial=historial,
        intentos=intentos,
        convalidados=convalidados,
        min_creditos=enrollment_settings.min_creditos,
        max_creditos=enrollment_settings.max_creditos,
        max_reprobadas=enrollment_settings.max_reprobadas,
        max_intentos=enrollment_settings.max_intentos,
        periodo=periodo,
    )
