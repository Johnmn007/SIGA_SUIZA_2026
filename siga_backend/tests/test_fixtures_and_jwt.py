import pytest
import os
from sqlalchemy import text
from tests.helpers.jwt_helper import create_test_token, get_jwt_secret
from tests.helpers.module_loader import load_module_component


@pytest.mark.asyncio
async def test_all_fixtures_create_and_clean_data(
    db_session,
    fixture_programa_y_unidad,
    fixture_periodo,
    fixture_docente,
    fixture_coordinador,
    fixture_estudiante,
    fixture_matricula,
    fixture_evaluacion,
):
    """Verifica que todos los fixtures de datos de referencia se creen correctamente en siga_test."""
    # Verificar estudiante
    est_count = await db_session.scalar(text("SELECT count(*) FROM estudiantes WHERE id = 100;"))
    assert est_count == 1

    # Verificar matrícula y detalle
    mat_count = await db_session.scalar(text("SELECT count(*) FROM matriculas WHERE id = 50;"))
    assert mat_count == 1
    det_count = await db_session.scalar(text("SELECT count(*) FROM matricula_detalles WHERE id = 80;"))
    assert det_count == 1

    # Verificar evaluación (nota aprobatoria >= 13)
    nota = await db_session.scalar(text("SELECT nota_final FROM evaluacion_registros WHERE id = 200;"))
    assert nota == 16
    assert nota >= 13, "Regla MINEDU: nota aprobatoria debe ser >= 13"

    # Verificar docente y coordinador en personal
    doc_count = await db_session.scalar(text("SELECT count(*) FROM perfiles_personal WHERE user_id = 10;"))
    assert doc_count == 1
    coord_count = await db_session.scalar(text("SELECT count(*) FROM perfiles_personal WHERE user_id = 20;"))
    assert coord_count == 1


def test_jwt_helper_token_generation_or_skip():
    """Verifica la generación de JWT con helper o su omisión limpia si no hay SECRET_KEY."""
    # Si SECRET_KEY está configurada, genera el token; de lo contrario pytest.skip actúa automáticamente
    token = create_test_token(user_id=10, email="docente.test@siga.edu", role="docente")
    assert token is not None
    assert len(token) > 20


def test_module_loader_loads_hyphenated_modules():
    """Verifica que el cargador dinámico resuelva módulos con guiones sin modificar carpetas."""
    mod_eval = load_module_component("mod-evaluacion", "routes")
    assert hasattr(mod_eval, "router")

    mod_prog = load_module_component("mod-programas-estudio", "routes")
    assert hasattr(mod_prog, "router")

    mod_acad = load_module_component("mod-gestion-academica", "schemas")
    assert hasattr(mod_acad, "MatriculaResponse")

    mod_user = load_module_component("mod-usuarios", "routes")
    assert hasattr(mod_user, "router")
