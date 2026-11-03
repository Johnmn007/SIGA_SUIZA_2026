import pytest
import os
from sqlalchemy import text
from conftest import test_engine, assert_safe_database_url


@pytest.mark.asyncio
async def test_failsafe_connected_database_is_siga_test():
    """Verifica que la conexión activa del motor de pruebas apunte únicamente a siga_test."""
    async with test_engine.connect() as conn:
        current_db = await conn.scalar(text("SELECT current_database();"))
        assert current_db == "siga_test", f"ALERTA: Se detectó conexión a '{current_db}' en vez de 'siga_test'!"


@pytest.mark.asyncio
async def test_failsafe_environment_variables():
    """Verifica que las variables de entorno para pruebas estén forzadas a siga_test."""
    assert os.environ.get("DB_NAME") == "siga_test"
    assert "siga_test" in os.environ.get("DATABASE_URL", "")


def test_failsafe_rejects_unsafe_database_urls():
    """Verifica que el validador de seguridad rechace categóricamente cualquier intento hacia siga_local o bases no autorizadas."""
    # Rechazo directo a siga_local
    with pytest.raises(RuntimeError) as exc_info:
        assert_safe_database_url("postgresql+asyncpg://postgres:pass@localhost:5432/siga_local")
    assert "VIOLACIÓN DE SEGURIDAD CRÍTICA" in str(exc_info.value)
    assert "siga_local" in str(exc_info.value)

    # Rechazo a intento de engaño con query params (ej. siga_local?db=siga_test)
    with pytest.raises(RuntimeError) as exc_info:
        assert_safe_database_url("postgresql+asyncpg://postgres:pass@localhost:5432/siga_local?db=siga_test")
    assert "VIOLACIÓN DE SEGURIDAD CRÍTICA" in str(exc_info.value)

    # Rechazo a otra base de datos institucional
    with pytest.raises(RuntimeError) as exc_info:
        assert_safe_database_url("postgresql+asyncpg://postgres:pass@localhost:5432/siga_core")
    assert "VIOLACIÓN DE SEGURIDAD CRÍTICA" in str(exc_info.value)

    # Rechazo a base de datos de producción
    with pytest.raises(RuntimeError):
        assert_safe_database_url("postgresql://postgres:pass@127.0.0.1:5432/siga_produccion")

    # Verifica que siga_test sí sea permitida (URL estándar)
    assert_safe_database_url("postgresql+asyncpg://postgres:pass@localhost:5432/siga_test")

    # Verifica que siga_test con query parameters (ej. sslmode, application_name) sea permitida
    assert_safe_database_url("postgresql+asyncpg://postgres:pass@localhost:5432/siga_test?ssl=disable&application_name=pytest")

    # Verifica que el motor activo pase la verificación
    assert_safe_database_url(test_engine)
