import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy import create_engine
from alembic import context
import os
import sys

# Agregar el directorio app al path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Configuración de Alembic
config = context.config

# Override DB URL desde variable de entorno
db_url = os.getenv("DB_URL")
if not db_url:
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "john.007")
    host = os.getenv("DB_HOST", "host.docker.internal")
    port = os.getenv("DB_PORT", "5432")
    dbname = os.getenv("DB_NAME", "siga_core")
    db_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
    config.set_main_option("sqlalchemy.url", db_url)
else:
    config.set_main_option("sqlalchemy.url", db_url)

# Convertir asyncpg a psycopg2 para migraciones síncronas
url = config.get_main_option("sqlalchemy.url")
if url and "asyncpg" in url:
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    config.set_main_option("sqlalchemy.url", url)

# Interpretar el archivo de config para logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData target
from app.core.identity.models import Base
import app.core.registry.models
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode using sync engine."""
    connectable = create_engine(
        config.get_main_option("sqlalchemy.url"),
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        do_run_migrations(connection)

    connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()