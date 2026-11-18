import asyncio
import os
import sys
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy import create_engine
from alembic import context
import warnings

# Agregar el directorio app al path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Configuración de Alembic
config = context.config

# --- OBTER DATABASE_URL DESDE LA CONFIG CENTRALIZADA ---
from app.core.config import settings as core_settings

# Usar la URL centralizada desde config.py
# Priority: CLI env var > Alembic config file > environment variable > fallback
db_url = os.getenv("ALEMBIC_DATABASE_URL")

if not db_url:
    # Intentar obtener de la configuración centralizada
    central_url = core_settings.DATABASE_URL
    if central_url:
        db_url = central_url
    else:
        # Fallback: construir desde variables separadas (solo para offline/migraciones manuales)
        # Advertir que esto es temporal
        warnings.warn(
            "Alembic: DATABASE_URL no definida usando configuración central. "
            "Construyendo desde variables separadas DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.",
            stacklevel=2
        )
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        dbname = os.getenv("DB_NAME", "siga_suiza_2026")
        
        # Verificar que el puerto no esté vacío
        if not port:
            port = "5432"
        
        db_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"

config.set_main_option("sqlalchemy.url", db_url)

# --- CONVERSIÓN DE DRIVER PARA MIGRACIONES SÍNCRONAS ---
url = config.get_main_option("sqlalchemy.url")
if url and "asyncpg" in url:
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
elif url and "psycopg2" not in url and "+asyncpg" not in url:
    # Ya viene en formato psycopg2 puro, dejarlo como está
    pass
config.set_main_option("sqlalchemy.url", url)

# Interpretar el archivo de config para logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData target - Importar todos los modelos necesarios
from app.core.identity.models import Base
import app.core.registry.models
from app.core.identity.seeds import seeder_role, seeder_permission, seeder_user
from app.modules.mod_usuarios.models import Usuario, Rol, Permiso, PerfilPersonal
from app.modules.mod_evaluacion.models import *
from app.modules.mod_programas_estudio.models import *
from app.modules.mod_planes_estudio.models import *
from app.modules.mod_gestion_academica.models import *
from app.modules.mod_admision.models import *
from app.modules.mod_auditoria.models import *

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