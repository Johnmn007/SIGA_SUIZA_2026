from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import MetaData
from app.core.config import settings
import ssl

# Metadata para el Core (solo identidad)
metadata = MetaData()
Base = declarative_base(metadata=metadata)

# SSL: PostgreSQL de Railway (contrail.proxy.railway.internal) y hosts internos
# no requieren SSL cuando la conexión es desde dentro de la red de Railway.
# Evitar ssl=default para hosts internos que causan ConnectionRefusedError.
_ssl_exempt_hosts = ("localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres", "contrail.proxy.railway.internal")
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

# Si el host es uno exento, no usar SSL;otherwise usar SSL con contexto permissivo.
if settings.DB_HOST and settings.DB_HOST in _ssl_exempt_hosts:
    connect_args = {}
else:
    connect_args = {"ssl": _ssl_ctx}

# Engine asíncrono para el Core
# Usar settings.database_url que ya tiene la lógica de conversión postgresql:// -> postgresql+asyncpg://
engine = create_async_engine(settings.database_url, echo=settings.debug, connect_args=connect_args)

# Session local asíncrona
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    """Dependencia de base de datos para el Core"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()