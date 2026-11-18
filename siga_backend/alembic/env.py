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

# DATABASE_URL es obligatoria - No se construye silenciosamente desde
# DB_HOST, DB_USER, DB_PORT o DB_NAME con credenciales predeterminadas.
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("ERROR: DATABASE_URL environment variable is required for Alembic migrations.") >&2
    sys.exit(1)

config.set_main_option("sqlalchemy.url", db_url)

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