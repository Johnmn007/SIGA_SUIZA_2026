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


def es_periodo_inicio_anio(periodo_ref) -> bool:
    """Determina si un periodo académico corresponde al inicio de año lectivo.

    Ejemplos de inicio de año: '2026-I', '2027-I', '2028-I', '2026-1'.
    Solo en estos periodos ocurre la admisión y matrícula automática de ingresantes ('cachimbos').
    En periodos subsecuentes (como '2026-II', '2027-II', '2026-III') no existen cachimbos nuevos;
    todos los estudiantes son continuadores o tienen trayectoria académica histórica.
    """
    if not periodo_ref:
        return True  # Fallback permisivo si no se indica periodo

    if isinstance(periodo_ref, dict):
        codigo = periodo_ref.get("codigo") or periodo_ref.get("nombre") or ""
    else:
        codigo = str(getattr(periodo_ref, "codigo", periodo_ref) or "")

    codigo_clean = codigo.strip().upper()
    if not codigo_clean:
        return True

    import re
    # Reconoce sufijos -I, _I, -1, _1, " I", " 1"
    return bool(re.search(r"[-_\s](I|1)$", codigo_clean)) or codigo_clean.endswith("-I") or codigo_clean.endswith("-1")


def normalizar_casuistica(valor):
    """Convierte un texto libre (p. ej. del frontend) a una casuística canónica."""
    if valor is None:
        return None
    return _ALIAS_CASUISTICA.get(str(valor).strip().lower())


def clasificar_casuistica(historial, convalidados=None, es_periodo_inicio=True):
    """Deduce la casuística a partir del historial académico y del periodo.

    ``historial``: dict ``{unidad_id: estado}``.
    Prioriza la evidencia del propio historial sobre el valor por defecto.
    En periodos que no son de inicio de año (ej. 2026-II), no existen ingresantes ('cachimbos');
    un alumno sin historial se clasifica como Regular.
    """
    convalidados = convalidados or set()
    if not historial and not convalidados:
        return Casuistica.INGRESANTE.value if es_periodo_inicio else Casuistica.REGULAR.value
    if any(estado == EstadoCurso.DESAPROBADO.value for estado in historial.values()):
        return Casuistica.IRREGULAR.value
    return Casuistica.REGULAR.value


class TipoAlumno(str, Enum):
    """Tipos de alumno del diagrama (Sección 2 — tipos de alumnos históricos).

    - Invicto   : alumno sin cursos a cargo (no arrastra unidades).
    - Jalado    : alumno con cursos a cargo (desaprobó o se retiró).
    - Historico : alumno que proviene de un plan de estudios anterior o de cohorte previa.
    """

    INGRESANTE = "Ingresante"
    INVICTO = "Invicto"
    JALADO = "Jalado"
    HISTORICO = "Historico"


def clasificar_tipo_alumno(historial, convalidados=None, es_historico=False, es_periodo_inicio=True):
    """Deduce el tipo de alumno (Sección 2 del diagrama).

    ``historial``: dict ``{unidad_id: estado}``.
    ``es_historico``: True si el plan de origen difiere del plan vigente o el periodo es intermedio.
    """
    convalidados = convalidados or set()
    if es_historico:
        return TipoAlumno.HISTORICO.value
    if not historial and not convalidados:
        # En periodos intermedios (ej. 2026-II) no existen ingresantes nuevos; se tratan como históricos
        return TipoAlumno.INGRESANTE.value if es_periodo_inicio else TipoAlumno.HISTORICO.value
    if any(estado in ESTADOS_ARRastre for estado in historial.values()):
        return TipoAlumno.JALADO.value
    return TipoAlumno.INVICTO.value
