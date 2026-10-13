"""Motor de reglas de matrícula (puro, sin I/O).

Traduce a código lo que describe el diagrama de flujo y
``docs/14-PLAN-MATRICULAS-CASUISTICAS.md``:

1. Determinación automática del ciclo (según avance del plan).
2. Cursos a cargo / arrastre (jalados).
3. Bloqueo por prerrequisitos.
4. Tope de créditos y regla de "tercera vez".
5. Clasificación de casuística (ingresante / invicto / irregular / …).
6. Validación de una selección en modo flexible (advierte) o estricto (bloquea).
7. Ventana de matrícula (regular vs extemporánea).

El motor no accede a BD ni a la red: recibe un :class:`Contexto` ya construido
(ver ``enrollment_service.py``). Esto lo hace 100 % testeable.
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Dict, List, Optional

from domain import (
    Casuistica,
    EngineMode,
    EstadoCurso,
    EstadoPeriodo,
    ESTADOS_APROBATORIOS,
    ESTADOS_ARRastre,
)


# --------------------------------------------------------------------------
# Estructuras de entrada / salida
# --------------------------------------------------------------------------

@dataclass
class Unidad:
    """Unidad didáctica normalizada del plan de estudios."""

    id: int
    nombre: str = ""
    creditos: int = 0
    periodo: int = 0  # ciclo al que pertenece
    prerequisitos: List[int] = field(default_factory=list)


@dataclass
class Contexto:
    """Todo lo que el motor necesita para decidir."""

    mode: str = EngineMode.FLEXIBLE.value
    casuistica: Optional[str] = None
    unidades: List[Unidad] = field(default_factory=list)
    historial: Dict[int, str] = field(default_factory=dict)
    intentos: Dict[int, int] = field(default_factory=dict)
    convalidados: set = field(default_factory=set)
    min_creditos: int = 1
    max_creditos: int = 40
    max_reprobadas: int = 3
    max_intentos: int = 3
    periodo: Optional[dict] = None

    @property
    def estricto(self) -> bool:
        return self.mode == EngineMode.STRICT.value


@dataclass
class UnidadPropuesta:
    id: int
    nombre: str
    creditos: int
    periodo: int
    categoria: str  # obligatoria | sugerida | bloqueada | permitida
    motivo: str = ""

    def to_dict(self) -> dict:
        return {
            "unidad_didactica_id": self.id,
            "nombre": self.nombre,
            "creditos": self.creditos,
            "periodo": self.periodo,
            "categoria": self.categoria,
            "motivo": self.motivo,
        }


@dataclass
class Propuesta:
    """Resultado del motor: qué puede/ debe llevar el estudiante."""

    casuistica: str
    modo: str
    ciclo_sugerido: int
    obligatorias: List[UnidadPropuesta] = field(default_factory=list)
    sugeridas: List[UnidadPropuesta] = field(default_factory=list)
    bloqueadas: List[UnidadPropuesta] = field(default_factory=list)
    permitidas: List[UnidadPropuesta] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    errores: List[str] = field(default_factory=list)
    creditos_obligatorios: int = 0
    min_creditos: int = 1
    max_creditos: int = 40

    def resumen(self) -> dict:
        return {
            "casuistica": self.casuistica,
            "modo": self.modo,
            "ciclo_sugerido": self.ciclo_sugerido,
            "creditos_obligatorios": self.creditos_obligatorios,
            "min_creditos": self.min_creditos,
            "max_creditos": self.max_creditos,
            "total_obligatorias": len(self.obligatorias),
            "total_sugeridas": len(self.sugeridas),
            "total_bloqueadas": len(self.bloqueadas),
        }

    def to_dict(self) -> dict:
        return {
            "casuistica": self.casuistica,
            "modo": self.modo,
            "ciclo_sugerido": self.ciclo_sugerido,
            "obligatorias": [u.to_dict() for u in self.obligatorias],
            "sugeridas": [u.to_dict() for u in self.sugeridas],
            "bloqueadas": [u.to_dict() for u in self.bloqueadas],
            "permitidas": [u.to_dict() for u in self.permitidas],
            "warnings": self.warnings,
            "errores": self.errores,
            "resumen": self.resumen(),
        }


# --------------------------------------------------------------------------
# Helpers de decisión
# --------------------------------------------------------------------------

def _superada(uid: int, ctx: Contexto) -> bool:
    """¿La unidad ya está aprobada o convalidada?"""
    return uid in ctx.convalidados or ctx.historial.get(uid) in ESTADOS_APROBATORIOS


def _motivo_bloqueo(unidad: Unidad, ctx: Contexto) -> Optional[str]:
    """Motivo por el que una unidad no debería poder cursarse (o None)."""
    if ctx.intentos.get(unidad.id, 0) >= ctx.max_intentos:
        return f"Máximo de intentos alcanzado ({ctx.max_intentos})"
    faltantes = [p for p in unidad.prerequisitos if not _superada(p, ctx)]
    if faltantes:
        return "Prerrequisito(s) no aprobado(s): " + ", ".join(str(p) for p in faltantes)
    return None


def siguiente_ciclo(ctx: Contexto) -> int:
    """Deduce el ciclo al que corresponde matricularse (avance del plan).

    Es el primer ciclo que aún no está completo; para un ingresante es el 1.
    Los cursos convalidados/arrastrados de ciclos previos no avanzan el ciclo.
    """
    ciclos = sorted({u.periodo for u in ctx.unidades if u.periodo})
    if not ciclos:
        return 1

    siguiente = ciclos[0]
    for ciclo in ciclos:
        del_ciclo = [u for u in ctx.unidades if u.periodo == ciclo]
        if del_ciclo and all(_superada(u.id, ctx) for u in del_ciclo):
            siguiente = ciclo + 1
        else:
            break
    return min(siguiente, ciclos[-1] + 1)


def _es_arrastre(unidad: Unidad, ctx: Contexto) -> bool:
    """¿Es un curso a cargo (desaprobado o retirado que debe repetirse)?"""
    if _superada(unidad.id, ctx):
        return False
    estado = ctx.historial.get(unidad.id)
    if estado in ESTADOS_ARRastre:
        return True
    # Se cursó alguna vez con resultado desconocido/neutro → pendiente.
    return ctx.intentos.get(unidad.id, 0) > 0 and estado is None


# --------------------------------------------------------------------------
# Construcción de la propuesta
# --------------------------------------------------------------------------

def construir_propuesta(ctx: Contexto) -> Propuesta:
    casuistica = ctx.casuistica or Casuistica.REGULAR.value

    # 1. Unidades bloqueadas (prerrequisito / intentos).
    bloqueadas: List[UnidadPropuesta] = []
    bloqueadas_ids = set()
    for u in ctx.unidades:
        if _superada(u.id, ctx):
            continue
        motivo = _motivo_bloqueo(u, ctx)
        if motivo:
            bloqueadas.append(UnidadPropuesta(u.id, u.nombre, u.creditos, u.periodo, "bloqueada", motivo))
            bloqueadas_ids.add(u.id)

    ciclo = siguiente_ciclo(ctx)

    # 2. Obligatorias (arrastre o bloque completo del Ciclo I para ingresantes).
    obligatorias: List[UnidadPropuesta] = []
    oblig_ids = set()
    if casuistica == Casuistica.INGRESANTE.value:
        for u in ctx.unidades:
            if u.periodo == 1 and u.id not in bloqueadas_ids and not _superada(u.id, ctx):
                obligatorias.append(UnidadPropuesta(u.id, u.nombre, u.creditos, u.periodo, "obligatoria", "Ciclo I (ingresante)"))
                oblig_ids.add(u.id)
    else:
        for u in ctx.unidades:
            if u.id in bloqueadas_ids or _superada(u.id, ctx):
                continue
            if _es_arrastre(u, ctx):
                obligatorias.append(UnidadPropuesta(u.id, u.nombre, u.creditos, u.periodo, "obligatoria", "Curso a cargo (arrastre)"))
                oblig_ids.add(u.id)

    # 3. Sugeridas (ciclo detectado, no superadas / no arrastradas / no bloqueadas).
    sugeridas: List[UnidadPropuesta] = []
    for u in ctx.unidades:
        if u.periodo != ciclo or _superada(u.id, ctx) or u.id in bloqueadas_ids or u.id in oblig_ids:
            continue
        sugeridas.append(UnidadPropuesta(u.id, u.nombre, u.creditos, u.periodo, "sugerida", "Ciclo correspondiente"))

    # 4. Permitidas (universo de selección para el modo flexible).
    permitidas = [
        UnidadPropuesta(u.id, u.nombre, u.creditos, u.periodo, "permitida")
        for u in ctx.unidades
        if not _superada(u.id, ctx) and u.id not in bloqueadas_ids
    ]

    # 5. Reglas agregadas y avisos.
    creditos_oblig = sum(u.creditos for u in obligatorias)
    errores: List[str] = []
    warnings: List[str] = []

    if creditos_oblig > ctx.max_creditos:
        msg = (f"Los cursos a cargo suman {creditos_oblig} créditos y superan el "
               f"máximo permitido ({ctx.max_creditos}).")
        (errores if ctx.estricto else warnings).append(msg)

    desaprobadas = [u for u in ctx.unidades if ctx.historial.get(u.id) == EstadoCurso.DESAPROBADO.value]
    if len(desaprobadas) > ctx.max_reprobadas:
        msg = (f"El estudiante tiene {len(desaprobadas)} unidades desaprobadas "
               f"(máximo permitido {ctx.max_reprobadas}). Evalúe suspensión por normativa.")
        (errores if ctx.estricto else warnings).append(msg)

    if bloqueadas:
        warnings.append(f"{len(bloqueadas)} unidad(es) bloqueada(s) por prerrequisito o intentos.")

    if casuistica == Casuistica.REINGRESANTE.value:
        warnings.append("Reingresante: verifique Resolución Directoral y adecuación de malla.")
    if casuistica == Casuistica.TRASLADO.value:
        warnings.append("Traslado: se requiere convalidación antes de matrícula regular.")
    if casuistica == Casuistica.CONVENIO.value:
        warnings.append("Convenio/Beca: se generará deuda 0.00 y se derivará el cobro a la entidad.")

    return Propuesta(
        casuistica=casuistica,
        modo=ctx.mode,
        ciclo_sugerido=ciclo,
        obligatorias=obligatorias,
        sugeridas=sugeridas,
        bloqueadas=bloqueadas,
        permitidas=permitidas,
        warnings=warnings,
        errores=errores,
        creditos_obligatorios=creditos_oblig,
        min_creditos=ctx.min_creditos,
        max_creditos=ctx.max_creditos,
    )


# --------------------------------------------------------------------------
# Validación de una selección concreta (usada al confirmar la matrícula)
# --------------------------------------------------------------------------

def validar_seleccion(ctx: Contexto, seleccion_ids: List[int]) -> tuple:
    """Valida las unidades elegidas.

    Devuelve ``(errores, warnings)``. En modo flexible las reglas "duras"
    se degradan a advertencias (la secretaría decide); en modo estricto
    bloquean la matrícula.
    """
    errores: List[str] = []
    warnings: List[str] = []

    ids = list(seleccion_ids or [])
    unicos = list(dict.fromkeys(ids))
    if len(unicos) != len(ids):
        errores.append("La selección contiene unidades didácticas duplicadas.")

    by_id = {u.id: u for u in ctx.unidades}
    desconocidas = [i for i in unicos if i not in by_id]
    if desconocidas:
        errores.append(f"Unidad(es) fuera del plan de estudios: {desconocidas}.")

    validos = [by_id[i] for i in unicos if i in by_id]
    total = sum(u.creditos for u in validos)

    if total < ctx.min_creditos:
        errores.append(f"Seleccionó {total} créditos; el mínimo es {ctx.min_creditos}.")
    if total > ctx.max_creditos:
        errores.append(f"Seleccionó {total} créditos; el máximo es {ctx.max_creditos}.")

    # Cursos a cargo obligatorios.
    propuesta = construir_propuesta(ctx)
    oblig_ids = {u.id for u in propuesta.obligatorias}
    faltantes = oblig_ids - set(unicos)
    if faltantes:
        msg = f"Debe incluir sus cursos a cargo: {sorted(faltantes)}."
        (errores if ctx.estricto else warnings).append(msg)

    # Reglas por unidad (prerrequisito / tercera vez).
    for u in validos:
        motivo = _motivo_bloqueo(u, ctx)
        if motivo:
            msg = f"{u.nombre or u.id}: {motivo}."
            (errores if ctx.estricto else warnings).append(msg)

    return errores, warnings


# --------------------------------------------------------------------------
# Ventana de matrícula (regular vs extemporánea)
# --------------------------------------------------------------------------

def _parse_fecha(valor) -> Optional[datetime]:
    if not valor:
        return None
    if isinstance(valor, datetime):
        return valor
    if isinstance(valor, date):
        return datetime(valor.year, valor.month, valor.day)
    try:
        return datetime.fromisoformat(str(valor).replace("Z", "").replace("z", ""))
    except (TypeError, ValueError):
        return None


def evaluar_ventana_matricula(periodo: Optional[dict], ahora: Optional[datetime] = None) -> tuple:
    """Determina si el periodo permite matricularse.

    Devuelve ``(permitido, es_extemporanea, mensaje)``.
    """
    if not periodo:
        return True, False, ""
    ahora = ahora or datetime.utcnow()
    estado = (periodo.get("estado") or "").strip().lower()

    if estado == EstadoPeriodo.CERRADO.value:
        return False, False, "El periodo está cerrado."
    if estado == EstadoPeriodo.PLANIFICACION.value:
        return False, False, "El periodo aún no abre matrícula."

    fin_regular = _parse_fecha(periodo.get("fecha_fin_matricula_regular"))
    fin_ext = _parse_fecha(periodo.get("fecha_fin_matricula_extemporanea"))

    if fin_ext and ahora > fin_ext:
        return False, False, "La matrícula extemporánea ha finalizado."
    if fin_regular and ahora > fin_regular:
        return True, True, "Fase de matrícula extemporánea."
    return True, False, ""
