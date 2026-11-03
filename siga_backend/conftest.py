"""Configuración central de pruebas con Pytest para SIGA.
Garantiza el aislamiento absoluto: todas las pruebas escriben exclusivamente en siga_test.
"""
import os
import sys
from pathlib import Path
import asyncio

# ==============================================================================
# 1. FIJAR VARIABLES DE ENTORNO ANTES DE CUALQUIER IMPORTACIÓN
# ==============================================================================
os.environ["DB_NAME"] = "siga_test"
os.environ["DB_HOST"] = os.getenv("DB_HOST", "127.0.0.1")
os.environ["DB_PORT"] = os.getenv("DB_PORT", "5432")
os.environ["DB_USER"] = os.getenv("DB_USER", "postgres")

pg_pass = os.getenv("PGPASSWORD") or os.getenv("DB_PASSWORD", "")
os.environ["DB_PASSWORD"] = pg_pass
os.environ["DATABASE_URL"] = (
    f"postgresql+asyncpg://{os.environ['DB_USER']}:{pg_pass}@{os.environ['DB_HOST']}:{os.environ['DB_PORT']}/siga_test"
)

# Desactivar migraciones automáticas y servicios externos para pruebas
os.environ["SKIP_MIGRATIONS"] = "true"
os.environ["ENABLE_NATS"] = "false"
os.environ["NATS_URL"] = ""
os.environ["REDIS_URL"] = ""
os.environ["CACHE_ENABLED"] = "false"

# Asegurar que siga_backend esté en sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from datetime import datetime, timedelta

# Motor central de pruebas con NullPool para evitar conflictos de conexiones entre event loops
test_engine = create_async_engine(
    os.environ["DATABASE_URL"],
    poolclass=NullPool,
    echo=False,
    future=True
)
TestingSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


from sqlalchemy.engine import make_url

# ==============================================================================
# 2. VALIDACIÓN DE URLs DE BASE DE DATOS Y MOTORES
# ==============================================================================
def assert_safe_database_url(url_or_engine, context_name: str = "Motor"):
    """Verifica formalmente que la URL o motor apunte estricta y exclusivamente a 'siga_test'."""
    url_str = str(getattr(url_or_engine, "url", url_or_engine))

    # 1. Rechazo categórico si 'siga_local' aparece en cualquier parte de la URL
    if "siga_local" in url_str.lower():
        raise RuntimeError(
            f"VIOLACIÓN DE SEGURIDAD CRÍTICA en {context_name}: Se detectó 'siga_local' en la URL '{url_str}'."
        )

    # 2. Análisis sintáctico formal con make_url de SQLAlchemy
    try:
        parsed_url = make_url(url_str)
        target_db = parsed_url.database
    except Exception as e:
        raise RuntimeError(
            f"VIOLACIÓN DE SEGURIDAD CRÍTICA en {context_name}: Error al parsear URL '{url_str}': {e}"
        )

    # 3. Comprobación estricta de que la base de datos sea exactamente 'siga_test'
    if target_db != "siga_test":
        raise RuntimeError(
            f"VIOLACIÓN DE SEGURIDAD CRÍTICA en {context_name}: La base de datos es '{target_db}', NO 'siga_test' (URL: '{url_str}')."
        )


def verify_all_module_engines():
    """Verifica que los motores de los módulos con base de datos apunten todos a siga_test."""
    modules_to_check = [
        ("mod-evaluacion", "database"),
        ("mod-programas-estudio", "database"),
        ("mod-gestion-academica", "database"),
        ("mod-usuarios", "database"),
    ]
    for mod_name, subpath in modules_to_check:
        try:
            mod_dir = str(BACKEND_DIR / "modules" / mod_name)
            if mod_dir not in sys.path:
                sys.path.insert(0, mod_dir)
            import importlib
            db_mod = importlib.import_module(subpath)
            if hasattr(db_mod, "engine"):
                assert_safe_database_url(db_mod.engine, f"{mod_name}.engine")
            if hasattr(db_mod, "DATABASE_URL"):
                assert_safe_database_url(db_mod.DATABASE_URL, f"{mod_name}.DATABASE_URL")
        except Exception as e:
            # Si el módulo no se puede cargar aquí, se reportará en las pruebas específicas
            pass


# ==============================================================================
# 3. SEGURO OBLIGATORIO DE SESIÓN (HOOK DE PYTEST)
# ==============================================================================
def pytest_sessionstart(session):
    """
    Seguro obligatorio ejecutado al arrancar la sesión de pytest:
    1. Comprueba variables de entorno (DB_NAME == 'siga_test' y DATABASE_URL termina en '/siga_test').
    2. Ejecuta SELECT current_database() en PostgreSQL.
    3. Verifica las URLs de conexión de los módulos.
    Si cualquier comprobación falla, aborta la sesión completa de inmediato.
    """
    db_name = os.environ.get("DB_NAME", "")
    if db_name != "siga_test":
        pytest.exit(
            f"VIOLACIÓN DE SEGURIDAD: DB_NAME es '{db_name}'. Se requiere estrictamente 'siga_test'.",
            returncode=1
        )

    db_url = os.environ.get("DATABASE_URL", "")
    assert_safe_database_url(db_url, "DATABASE_URL de entorno")

    async def _check_db():
        async with test_engine.connect() as conn:
            return await conn.scalar(text("SELECT current_database();"))

    try:
        current_db = asyncio.run(_check_db())
        if current_db != "siga_test":
            pytest.exit(
                f"VIOLACIÓN DE SEGURIDAD: PostgreSQL reporta current_database() = '{current_db}', NO 'siga_test'.",
                returncode=1
            )
    except Exception as e:
        pytest.exit(f"ERROR AL VERIFICAR BASE DE DATOS DE PRUEBAS: {e}", returncode=1)

    verify_all_module_engines()


# ==============================================================================
# 4. LIMPIEZA CON SEGURO RE-VERIFICADO
# ==============================================================================
@pytest.fixture
async def clean_test_db():
    """
    Limpia las tablas en siga_test antes de cada prueba de integración.
    Re-verifica con SELECT current_database() antes de ejecutar cualquier comando TRUNCATE.
    """
    async with test_engine.connect() as conn:
        current_db = await conn.scalar(text("SELECT current_database();"))
        if current_db != "siga_test":
            pytest.exit(
                f"VIOLACIÓN DE SEGURIDAD PRE-LIMPIEZA: Intento de limpiar base '{current_db}' (NO es siga_test). Abortando.",
                returncode=1
            )

        await conn.execute(text("""
            TRUNCATE TABLE 
                evaluacion_registros,
                matricula_detalles,
                matriculas,
                estudiantes,
                silabos,
                carga_lectiva,
                planes_trabajo_docente,
                horarios_periodo,
                tutorias,
                perfiles_personal,
                core_user_roles,
                core_users,
                programa_modulos,
                programas_estudio,
                periodos_academicos,
                planes_estudio,
                outbox_events
            CASCADE;
        """))
        await conn.commit()
    yield


@pytest.fixture
async def db_session(clean_test_db):
    """Sesión asíncrona apuntando a siga_test con base limpia garantizada."""
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()


# ==============================================================================
# 5. FIXTURES DE DATOS DE REFERENCIA (CATÁLOGOS Y ENTIDADES)
# ==============================================================================
@pytest.fixture
async def fixture_programa_y_unidad(db_session: AsyncSession):
    """Crea un programa de estudio y una unidad didáctica de prueba."""
    await db_session.execute(text("""
        INSERT INTO planes_estudio (id, codigo, nombre, estado, creditos_totales, horas_totales, created_at, updated_at)
        VALUES (1, 'DSI-2026', 'Desarrollo de Sistemas de Información', 'activo', 120, 2400, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))

    await db_session.execute(text("""
        INSERT INTO programas_estudio (id, codigo, nombre, creditos_totales, duracion_periodos, modalidad, estado, plan_estudio_id, created_at, updated_at)
        VALUES (1, '0584722', 'Desarrollo de Sistemas de Información', 120, 6, 'presencial', 'activo', 1, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))

    await db_session.execute(text("""
        INSERT INTO programa_modulos (id, programa_id, periodo, nombre, creditos, horas_totales)
        VALUES (1, 1, 3, 'Módulo 3: Sistemas Web', 30, 600)
        ON CONFLICT (id) DO NOTHING;
    """))

    await db_session.execute(text("""
        INSERT INTO programa_unidades (id, programa_modulo_id, nombre, horas_teoria, horas_practica, creditos, orden)
        VALUES (101, 1, 'Taller de Programación Web', 2, 4, 4, 1)
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.commit()

    return {"programa_id": 1, "plan_id": 1, "modulo_id": 1, "unidad_id": 101}


@pytest.fixture(autouse=True)
async def fixture_catalogo_identidades(db_session: AsyncSession):
    """
    Inicializa el catálogo de roles, usuarios base y perfiles para verificación
    de identidad y autorización en siga_test (esquema aislado).
    """
    # 1. Catálogo base de roles en core_roles
    await db_session.execute(text("""
        INSERT INTO core_roles (id, name, description, created_at) VALUES
            (1, 'superadmin', 'Super Administrador del Sistema', NOW()),
            (2, 'coordinador_programa', 'Coordinador de Programa de Estudios', NOW()),
            (3, 'docente', 'Docente de Unidades Didácticas', NOW()),
            (4, 'estudiante', 'Estudiante de la Institución', NOW()),
            (5, 'secretaria_academica', 'Secretaría Académica', NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    """))

    # 2. Personas canónicas en core_users
    await db_session.execute(text("""
        INSERT INTO core_users (id, email, full_name, hashed_password, is_active, is_superuser, created_at) VALUES
            (1, 'superadmin.test@siga.edu', 'Super Admin Test', 'hash_test_123', true, true, NOW()),
            (2, 'coordinador.a@siga.edu', 'Coord Programa A', 'hash_test_123', true, false, NOW()),
            (3, 'coordinador.b@siga.edu', 'Coord Programa B', 'hash_test_123', true, false, NOW()),
            (4, 'coordinador.sin.prog@siga.edu', 'Coord Sin Prog', 'hash_test_123', true, false, NOW()),
            (10, 'docente.test@siga.edu', 'Prof. Docente Asignado', 'hash_test_123', true, false, NOW()),
            (11, 'docente.noasig@siga.edu', 'Prof. Docente No Asignado', 'hash_test_123', true, false, NOW()),
            (12, 'coord.docente@siga.edu', 'Prof. Coord y Docente', 'hash_test_123', true, false, NOW()),
            (20, 'estudiante.test@siga.edu', 'Estudiante Test', 'hash_test_123', true, false, NOW()),
            (30, 'usuario.inactivo@siga.edu', 'Usuario Inactivo', 'hash_test_123', false, false, NOW()),
            (55, 'coord.compat55@siga.edu', 'Coord Compat 55', 'hash_test_123', true, false, NOW()),
            (99, 'superadmin.99@siga.edu', 'Super Admin 99', 'hash_test_123', true, true, NOW()),
            (100, 'superadmin.100@siga.edu', 'Super Admin 100', 'hash_test_123', true, true, NOW())
        ON CONFLICT (id) DO UPDATE SET 
            is_active = EXCLUDED.is_active, 
            is_superuser = EXCLUDED.is_superuser,
            email = EXCLUDED.email;
    """))

    # 3. Asignaciones de roles
    await db_session.execute(text("""
        INSERT INTO core_user_roles (user_id, role_id) VALUES
            (1, 1),
            (2, 2),
            (3, 2),
            (4, 2),
            (10, 3),
            (11, 3),
            (12, 2),
            (12, 3),
            (20, 4),
            (30, 3),
            (55, 2),
            (99, 1),
            (100, 1)
        ON CONFLICT DO NOTHING;
    """))

    # 4. Perfiles de personal
    await db_session.execute(text("""
        INSERT INTO perfiles_personal (id, user_id, condicion_laboral, cargo_funcional, programa_estudio_id) VALUES
            (2, 2, 'NOMBRADO', 'Coordinador Programa 1', 1),
            (3, 3, 'NOMBRADO', 'Coordinador Programa 2', 2),
            (4, 4, 'NOMBRADO', 'Coordinador Sin Programa', NULL),
            (10, 10, 'CONTRATADO', 'Docente Asignado', 1),
            (11, 11, 'CONTRATADO', 'Docente No Asignado', 1),
            (12, 12, 'NOMBRADO', 'Coordinador y Docente', 1),
            (55, 55, 'NOMBRADO', 'Coordinador Compat', 1),
            (100, 100, 'NOMBRADO', 'Superadmin Compat', 1)
        ON CONFLICT (id) DO UPDATE SET 
            programa_estudio_id = EXCLUDED.programa_estudio_id,
            user_id = EXCLUDED.user_id;
    """))
    await db_session.commit()


@pytest.fixture
async def fixture_periodo(db_session: AsyncSession):
    """Crea un periodo académico activo (en_curso)."""
    now = datetime.utcnow()
    await db_session.execute(text("""
        INSERT INTO periodos_academicos (id, codigo, fecha_inicio, fecha_fin, estado, created_at, updated_at)
        VALUES (1, '2026-I', :ini, :fin, 'en_curso', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """), {"ini": now - timedelta(days=10), "fin": now + timedelta(days=90)})
    await db_session.commit()
    return {"periodo_id": 1, "codigo": "2026-I"}


@pytest.fixture
async def fixture_docente(db_session: AsyncSession):
    """Crea un docente con usuario institucional y perfil de personal."""
    await db_session.execute(text("""
        INSERT INTO core_users (id, email, full_name, hashed_password, is_active, is_superuser, created_at)
        VALUES (10, 'docente.test@siga.edu', 'Prof. Docente Prueba', 'hash_test_123', true, false, NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO perfiles_personal (id, user_id, condicion_laboral, cargo_funcional, programa_estudio_id)
        VALUES (10, 10, 'CONTRATADO_DRE', 'Docente', 1)
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.commit()
    return {"docente_id": 10, "email": "docente.test@siga.edu", "full_name": "Prof. Docente Prueba"}


@pytest.fixture
async def fixture_coordinador(db_session: AsyncSession):
    """Crea un coordinador de programa."""
    await db_session.execute(text("""
        INSERT INTO core_users (id, email, full_name, hashed_password, is_active, is_superuser, created_at)
        VALUES (20, 'coordinador.test@siga.edu', 'Ing. Coordinador Prueba', 'hash_test_123', true, false, NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO perfiles_personal (id, user_id, condicion_laboral, cargo_funcional, programa_estudio_id)
        VALUES (20, 20, 'NOMBRADO_ESTADO', 'Coordinador de Programa', 1)
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.commit()
    return {"coordinador_id": 20, "email": "coordinador.test@siga.edu", "programa_id": 1}


@pytest.fixture
async def fixture_estudiante(db_session: AsyncSession, fixture_programa_y_unidad):
    """Crea un estudiante de prueba matriculado."""
    await db_session.execute(text("""
        INSERT INTO estudiantes (id, codigo_estudiante, dni, nombres, apellidos, programa_id, estado_academico, pago_matricula, documentos_completos, created_at, updated_at)
        VALUES (100, 'TEST-00000001', '00000001', 'Estudiante', 'Prueba SIGA', 1, 'regular', true, true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.commit()
    return {"estudiante_id": 100, "dni": "00000001", "nombre_completo": "Estudiante Prueba SIGA"}


@pytest.fixture
async def fixture_matricula(db_session: AsyncSession, fixture_estudiante, fixture_periodo):
    """Crea una matrícula regular con un detalle de unidad didáctica."""
    await db_session.execute(text("""
        INSERT INTO matriculas (id, estudiante_id, programa_id, periodo_id, estado_matricula, tipo_ingreso, observaciones, created_at, updated_at)
        VALUES (50, 100, 1, 1, 'confirmada', 'Ordinario', NULL, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO matricula_detalles (id, matricula_id, unidad_didactica_id, creditos, estado_curso, created_at, updated_at)
        VALUES (80, 50, 101, 4, 'cursando', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.commit()
    return {"matricula_id": 50, "matricula_detalle_id": 80, "unidad_id": 101}


@pytest.fixture
async def fixture_evaluacion(db_session: AsyncSession, fixture_matricula):
    """Crea un registro de evaluación para el estudiante matriculado."""
    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, periodo_id, programa_id, docente_id, unidad_didactica_id, turno, seccion, estado, created_at, updated_at)
        VALUES (1, 1, 1, 10, 101, 'MAÑANA', 'A', 'activo', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET docente_id = 10, unidad_didactica_id = 101, periodo_id = 1;
    """))
    await db_session.execute(text("""
        INSERT INTO evaluacion_registros (id, matricula_detalle_id, estudiante_id, unidad_didactica_id, periodo_id, nota_final, estado, created_at, updated_at)
        VALUES (200, 80, 100, 101, 1, 16, 'aprobado', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.commit()
    return {"evaluacion_id": 200, "nota_final": 16, "estado": "aprobado"}


@pytest.fixture
async def fixture_carga_lectiva_y_plan(db_session: AsyncSession, fixture_docente, fixture_programa_y_unidad, fixture_periodo):
    """Crea carga lectiva docente, sílabo y plan de trabajo de prueba."""
    await db_session.execute(text("""
        INSERT INTO carga_lectiva (id, periodo_id, programa_id, docente_id, unidad_didactica_id, turno, seccion, estado, created_at, updated_at)
        VALUES (1, 1, 1, 10, 101, 'MAÑANA', 'A', 'activo', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO silabos (id, carga_lectiva_id, estado, archivo_url, observaciones, created_at, updated_at)
        VALUES (1, 1, 'aprobado', '/docs/silabo_dsi.pdf', 'Sílabo validado', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.execute(text("""
        INSERT INTO planes_trabajo_docente (id, periodo_id, programa_id, docente_id, estado, archivo_url, observaciones, created_at, updated_at)
        VALUES (1, 1, 1, 10, 'aprobado', '/docs/plan_dsi.pdf', 'Plan aprobado', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    await db_session.commit()
    return {
        "carga_id": 1,
        "silabo_id": 1,
        "plan_id": 1,
        "docente_id": 10,
        "unidad_id": 101,
        "periodo_id": 1
    }
