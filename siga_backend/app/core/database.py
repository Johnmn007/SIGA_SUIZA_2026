from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import MetaData
from app.core.config import settings
import ssl

# Metadata para el Core (solo identidad)
metadata = MetaData()
Base = declarative_base(metadata=metadata)

# SSL solo para BDs remotas con TLS (Railway, etc.).
# El PostgreSQL local corre con ssl=off; los hosts locales de Docker tampoco usan SSL.
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE
_SSL_EXEMPT_HOSTS = ("localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres")
connect_args = {"ssl": _ssl_ctx} if settings.DB_HOST not in _SSL_EXEMPT_HOSTS else {}

# Engine asíncrono para el Core
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