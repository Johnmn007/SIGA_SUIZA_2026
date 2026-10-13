"""Pruebas del motor de matrícula (puras, sin base de datos ni red).

Ejecutar desde ``modules/mod-gestion-academica``::

    python -m unittest test_enrollment_engine -v
"""
import unittest
from datetime import datetime, timedelta

from domain import Casuistica, EstadoCurso, EstadoPeriodo
from enrollment_engine import (
    Contexto,
    Unidad,
    construir_propuesta,
    evaluar_ventana_matricula,
    validar_seleccion,
)


def _malla_basica():
    """Plan de 3 ciclos, 2 unidades por ciclo, con un prerrequisito.

    Ciclo 1: u1, u2
    Ciclo 2: u3 (requiere u1), u4
    Ciclo 3: u5 (requiere u3), u6
    """
    return [
        Unidad(1, "Matemática", 4, 1),
        Unidad(2, "Comunicación", 4, 1),
        Unidad(3, "Física", 4, 2, prerequisitos=[1]),
        Unidad(4, "Historia", 3, 2),
        Unidad(5, "Cálculo", 4, 3, prerequisitos=[3]),
        Unidad(6, "Ética", 2, 3),
    ]


def _ctx(**kwargs):
    base = dict(mode="flexible", casuistica=None, unidades=_malla_basica())
    base.update(kwargs)
    return Contexto(**base)


class TestMotorMatricula(unittest.TestCase):

    def test_ingresante_lleva_ciclo_i(self):
        ctx = _ctx(casuistica=Casuistica.INGRESANTE.value)
        prop = construir_propuesta(ctx)
        self.assertEqual(prop.ciclo_sugerido, 1)
        ids = {u.id for u in prop.obligatorias}
        self.assertEqual(ids, {1, 2})

    def test_invicto_avanza_de_ciclo(self):
        ctx = _ctx(
            casuistica=Casuistica.REGULAR.value,
            historial={1: EstadoCurso.APROBADO.value, 2: EstadoCurso.APROBADO.value},
        )
        prop = construir_propuesta(ctx)
        self.assertEqual(prop.ciclo_sugerido, 2)
        self.assertEqual({u.id for u in prop.sugeridas}, {3, 4})
        self.assertEqual(prop.obligatorias, [])

    def test_jalado_genera_curso_a_cargo(self):
        ctx = _ctx(
            casuistica=Casuistica.IRREGULAR.value,
            historial={1: EstadoCurso.DESAPROBADO.value, 2: EstadoCurso.APROBADO.value},
            intentos={1: 1},
        )
        prop = construir_propuesta(ctx)
        self.assertEqual({u.id for u in prop.obligatorias}, {1})
        self.assertTrue(prop.creditos_obligatorios > 0)

    def test_prerrequisito_bloquea(self):
        # u3 requiere u1, que no está aprobada -> bloqueada.
        ctx = _ctx(historial={2: EstadoCurso.APROBADO.value}, intentos={2: 1})
        prop = construir_propuesta(ctx)
        bloqueadas = {u.id for u in prop.bloqueadas}
        self.assertIn(3, bloqueadas)
        self.assertTrue(all("Prerrequisito" in u.motivo for u in prop.bloqueadas if u.id == 3))

    def test_tercera_vez_bloquea(self):
        ctx = _ctx(
            historial={1: EstadoCurso.DESAPROBADO.value},
            intentos={1: 3},
            max_intentos=3,
        )
        prop = construir_propuesta(ctx)
        bloqueadas = {u.id for u in prop.bloqueadas}
        self.assertIn(1, bloqueadas)
        self.assertTrue(any("intentos" in u.motivo for u in prop.bloqueadas if u.id == 1))

    def test_validar_seleccion_flexible_advierte(self):
        ctx = _ctx(
            casuistica=Casuistica.IRREGULAR.value,
            historial={1: EstadoCurso.DESAPROBADO.value},
            intentos={1: 1},
        )
        # No incluye el curso a cargo (u1) -> en flexible es advertencia.
        errores, warnings = validar_seleccion(ctx, [2])
        self.assertEqual(errores, [])
        self.assertTrue(any("cursos a cargo" in w for w in warnings))

    def test_validar_seleccion_estricto_bloquea(self):
        ctx = _ctx(
            mode="strict",
            casuistica=Casuistica.IRREGULAR.value,
            historial={1: EstadoCurso.DESAPROBADO.value},
            intentos={1: 1},
        )
        errores, _ = validar_seleccion(ctx, [2])
        self.assertTrue(any("cursos a cargo" in e for e in errores))

    def test_tope_creditos_excedido_en_estricto(self):
        ctx = _ctx(mode="strict", casuistica=Casuistica.INGRESANTE.value, max_creditos=5)
        # Ciclo I suma 8 créditos > 5 -> error en estricto.
        prop = construir_propuesta(ctx)
        self.assertTrue(prop.errores)

    def test_boleta_ventana_extemporanea(self):
        ayer = (datetime.utcnow() - timedelta(days=1)).isoformat()
        manana = (datetime.utcnow() + timedelta(days=1)).isoformat()
        permitido, extemporanea, _ = evaluar_ventana_matricula({
            "estado": EstadoPeriodo.MATRICULA_ABIERTA.value,
            "fecha_fin_matricula_regular": ayer,
            "fecha_fin_matricula_extemporanea": manana,
        })
        self.assertTrue(permitido)
        self.assertTrue(extemporanea)

    def test_periodo_cerrado_no_permite(self):
        permitido, _, mensaje = evaluar_ventana_matricula({"estado": EstadoPeriodo.CERRADO.value})
        self.assertFalse(permitido)
        self.assertIn("cerrado", mensaje.lower())


if __name__ == "__main__":
    unittest.main()
