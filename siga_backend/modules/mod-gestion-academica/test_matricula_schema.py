"""Pruebas unitarias para schemas de matrícula (sin base de datos ni red).

Ejecutar desde modules/mod-gestion-academica:
    python -m unittest test_matricula_schema -v
"""
import unittest
from schemas import MatriculaResponse, MatriculaBase


class TestMatriculaSchema(unittest.TestCase):

    def test_matricula_permite_observaciones_none(self):
        """Verifica que MatriculaResponse y MatriculaBase acepten observaciones=None (compatibilidad con BD)."""
        matricula = MatriculaResponse(
            id=1,
            estudiante_id=10,
            programa_id=2,
            periodo_id=3,
            tipo_ingreso="Ordinario",
            estado_matricula="regular",
            observaciones=None,
            detalles=[]
        )
        self.assertIsNone(matricula.observaciones)


if __name__ == "__main__":
    unittest.main()
