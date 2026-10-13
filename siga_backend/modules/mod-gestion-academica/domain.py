"""Dominio del proceso de matrícula.

Centraliza los estados canónicos y las casuísticas para eliminar
inconsistencias (p. ej. "anulado" vs "anulada") y sirve de vocabulario común
al motor de reglas descrito en:

- docs/14-PLAN-MATRICULAS-CASUISTICAS.md  (casuísticas A–E, doble motor)
- docs/13-PLAN-CASUISTICAS-ACADEMICAS.md  (Fase 4: convalidaciones, reserva…)
- EnrollmentFlowDiagram.jsx                (diagrama de flujo)
"""
from enum import Enum


class EstadoMatricula(str, Enum):
    """Ciclo de vida de una matrícula."""

    PENDIENTE = "pendiente"
    CONFIRMADA = "confirmada"
    ANULADA = "anulada"
    ANULADA_POR_RESERVA = "anulada_por_reserva"

    @classmethod
    def anuladas(cls):
        """Estados que NO cuentan como una matrícula vigente."""
        return {cls.ANULADA.value, cls.ANULADA_POR_RESERVA.value}


class EstadoCurso(str, Enum):
    """Estado de una unidad didáctica dentro de una matrícula."""

    CURSANDO = "cursando"
    APROBADO = "aprobado"
    DESAPROBADO = "desaprobado"
    RETIRADO = "retirado"
    CONVALIDADO = "convalidado"


class EstadoPeriodo(str, Enum):
    """Ciclo de vida del periodo académico (mod-programas-estudio)."""

    PLANIFICACION = "planificacion"
    MATRICULA_ABIERTA = "matricula_abierta"
    EN_CURSO = "en_curso"
    CERRADO = "cerrado"

    @classmethod
    def valores(cls):
        return {estado.value for estado in cls}


class Casuistica(str, Enum):
    """Casos de matrícula (docs/14, sección 2)."""

    INGRESANTE = "Ingresante"      # Caso A: primera vez
    REGULAR = "Regular"            # Caso B: invicto
    IRREGULAR = "Irregular"        # Caso C: con cursos reprobados
    REINGRESANTE = "Reingresante"  # Caso D: retorno tras reserva
    TRASLADO = "Traslado"          # Traslado interno/externo
    CONVENIO = "Convenio"          # Caso E: becas/convenios


class EngineMode(str, Enum):
    """Doble motor (docs/14, sección 3)."""

    FLEXIBLE = "flexible"  # asistente visual: la secretaría decide
    STRICT = "strict"      # reglas duras aplicadas en el backend


# --- Conjuntos de apoyo para el motor -------------------------------------

# Unidades cuya UD ya está "superada" (no debe volver a cursarse).
ESTADOS_APROBATORIOS = {EstadoCurso.APROBADO.value, EstadoCurso.CONVALIDADO.value}

# Unidades que generan "curso a cargo" (arrastre) al reprobarse/retirarse.
ESTADOS_ARRastre = {EstadoCurso.DESAPROBADO.value, EstadoCurso.RETIRADO.value}


# --- Normalización de casuística ------------------------------------------

_ALIAS_CASUISTICA = {
    "ingresante": Casuistica.INGRESANTE.value,
    "ordinario": Casuistica.INGRESANTE.value,
    "cachimbo": Casuistica.INGRESANTE.value,
    "nuevo": Casuistica.INGRESANTE.value,
    "primera vez": Casuistica.INGRESANTE.value,
    "regular": Casuistica.REGULAR.value,
    "invicto": Casuistica.REGULAR.value,
    "irregular": Casuistica.IRREGULAR.value,
    "jalado": Casuistica.IRREGULAR.value,
    "reingresante": Casuistica.REINGRESANTE.value,
    "reingreso": Casuistica.REINGRESANTE.value,
    "traslado": Casuistica.TRASLADO.value,
    "convenio": Casuistica.CONVENIO.value,
    "becado": Casuistica.CONVENIO.value,
    "beca": Casuistica.CONVENIO.value,
}


def normalizar_casuistica(valor):
    """Convierte un texto libre (p. ej. del frontend) a una casuística canónica."""
    if valor is None:
        return None
    return _ALIAS_CASUISTICA.get(str(valor).strip().lower())


def clasificar_casuistica(historial, convalidados=None):
    """Deduce la casuística a partir del historial académico.

    ``historial``: dict ``{unidad_id: estado}``.
    Prioriza la evidencia del propio historial sobre el valor por defecto.
    """
    convalidados = convalidados or set()
    if not historial and not convalidados:
        return Casuistica.INGRESANTE.value
    if any(estado == EstadoCurso.DESAPROBADO.value for estado in historial.values()):
        return Casuistica.IRREGULAR.value
    return Casuistica.REGULAR.value
