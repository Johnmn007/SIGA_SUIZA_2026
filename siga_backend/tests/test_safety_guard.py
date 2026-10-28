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
    with pytest.raises(RuntimeError) as exc_info:
        assert_safe_database_url("postgresql+asyncpg://postgres:pass@localhost:5432/siga_local")
    assert "VIOLACIÓN DE SEGURIDAD CRÍTICA" in str(exc_info.value)

    with pytest.raises(RuntimeError):
        assert_safe_database_url("postgresql+asyncpg://postgres:pass@localhost:5432/siga_core")

    # Verifica que siga_test sí sea permitida
    assert_safe_database_url("postgresql+asyncpg://postgres:pass@localhost:5432/siga_test")
