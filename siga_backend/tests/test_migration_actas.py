"""Pruebas de migración y verificación de esquema para cierre de actas en carga_lectiva.
Garantiza el aislamiento: se ejecuta exclusivamente contra siga_test y verifica idempotencia.
"""
from pathlib import Path
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_migracion_carga_lectiva_actas_columnas_y_tipos(db_session: AsyncSession):
    """
    Verifica que:
    1. La sesión esté conectada estrictamente a siga_test.
    2. Las 4 columnas de cierre de actas existan en carga_lectiva con los tipos esperados.
    """
    # 1. Seguro mandatorio de base de datos
    current_db = await db_session.scalar(text("SELECT current_database();"))
    assert current_db == "siga_test", (
        f"VIOLACIÓN DE SEGURIDAD: La prueba se está ejecutando en '{current_db}'. Debe ser estrictamente 'siga_test'."
    )

    # 2. Consultar columnas y tipos en information_schema
    res = await db_session.execute(text("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'carga_lectiva';
    """))
    columns = {row[0]: {"type": row[1], "nullable": row[2], "default": row[3]} for row in res.fetchall()}

    # Verificar fecha_limite_notas (DATE, NULL)
    assert "fecha_limite_notas" in columns, "Falta la columna fecha_limite_notas"
    assert columns["fecha_limite_notas"]["type"] == "date"
    assert columns["fecha_limite_notas"]["nullable"] == "YES"

    # Verificar acta_cerrada (BOOLEAN, NOT NULL, DEFAULT FALSE)
    assert "acta_cerrada" in columns, "Falta la columna acta_cerrada"
    assert columns["acta_cerrada"]["type"] == "boolean"
    assert columns["acta_cerrada"]["nullable"] == "NO"
    assert "false" in str(columns["acta_cerrada"]["default"]).lower()

    # Verificar acta_cerrada_at (TIMESTAMP, NULL)
    assert "acta_cerrada_at" in columns, "Falta la columna acta_cerrada_at"
    assert "timestamp" in columns["acta_cerrada_at"]["type"]
    assert columns["acta_cerrada_at"]["nullable"] == "YES"

    # Verificar acta_cerrada_por (INTEGER, NULL)
    assert "acta_cerrada_por" in columns, "Falta la columna acta_cerrada_por"
    assert columns["acta_cerrada_por"]["type"] == "integer"
    assert columns["acta_cerrada_por"]["nullable"] == "YES"


@pytest.mark.asyncio
async def test_migracion_carga_lectiva_actas_es_idempotente(db_session: AsyncSession):
    """
    Verifica que el script SQL de migración sea 100% idempotente:
    Ejecutarlo dos veces consecutivas no arroja errores ni altera el esquema.
    """
    # Seguro de base de datos
    current_db = await db_session.scalar(text("SELECT current_database();"))
    assert current_db == "siga_test", f"Violación de seguridad: base actual es '{current_db}'."

    migration_file = Path(__file__).resolve().parent.parent / "db_scripts" / "001_carga_lectiva_actas.sql"
    assert migration_file.exists(), f"No se encontró el script de migración en {migration_file}"

    sql_statements = migration_file.read_text(encoding="utf-8")

    # Primera ejecución
    await db_session.execute(text(sql_statements))
    await db_session.commit()

    # Segunda ejecución (prueba de idempotencia)
    await db_session.execute(text(sql_statements))
    await db_session.commit()

    # Confirmar que las columnas siguen existiendo
    res = await db_session.execute(text("""
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'carga_lectiva'
          AND column_name IN ('fecha_limite_notas', 'acta_cerrada', 'acta_cerrada_at', 'acta_cerrada_por');
    """))
    assert res.scalar() == 4, "Las 4 columnas deben seguir presentes tras re-ejecución idempotente"


@pytest.mark.asyncio
async def test_fila_existente_carga_lectiva_valores_por_defecto(db_session: AsyncSession, fixture_carga_lectiva_y_plan):
    """
    Verifica que una fila de carga_lectiva mantenga los valores por defecto:
    - acta_cerrada = FALSE
    - fecha_limite_notas = NULL
    - acta_cerrada_at = NULL
    - acta_cerrada_por = NULL
    """
    current_db = await db_session.scalar(text("SELECT current_database();"))
    assert current_db == "siga_test", f"Violación de seguridad: base actual es '{current_db}'."

    carga_id = fixture_carga_lectiva_y_plan["carga_id"]

    res = await db_session.execute(text("""
        SELECT fecha_limite_notas, acta_cerrada, acta_cerrada_at, acta_cerrada_por
        FROM carga_lectiva
        WHERE id = :id;
    """), {"id": carga_id})
    row = res.fetchone()

    assert row is not None, f"No se encontró la fila de carga_lectiva con id {carga_id}"
    fecha_limite, acta_cerrada, cerrada_at, cerrada_por = row

    assert fecha_limite is None, f"Se esperaba fecha_limite_notas NULL, se obtuvo: {fecha_limite}"
    assert acta_cerrada is False, f"Se esperaba acta_cerrada False, se obtuvo: {acta_cerrada}"
    assert cerrada_at is None, f"Se esperaba acta_cerrada_at NULL, se obtuvo: {cerrada_at}"
    assert cerrada_por is None, f"Se esperaba acta_cerrada_por NULL, se obtuvo: {cerrada_por}"
