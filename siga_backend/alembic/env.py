import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
import os
import sys
import ssl

# Agregar el directorio app al path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Configuración de Alembic
config = context.config

# Override DB URL desde variable de entorno
db_url = os.getenv("DB_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

# SSL solo para BDs remotas con TLS (Railway, etc.).
# El PostgreSQL local corre con ssl=off, asi que se omite el upgrade a TLS.
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

_SSL_EXEMPT_HOSTS = ("localhost", "127.0.0.1", "::1", "host.docker.internal")


def _url_host(url: str) -> str:
    try:
        authority = url.split("://", 1)[1].split("/", 1)[0]
        return authority.rsplit("@", 1)[-1].split(":", 1)[0]
    except (IndexError, AttributeError):
        return ""


_target_host = os.getenv("DB_HOST") or _url_host(db_url or config.get_main_option("sqlalchemy.url") or "")
connect_args = {"ssl": ssl_ctx} if _target_host not in _SSL_EXEMPT_HOSTS else {}

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

async def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())