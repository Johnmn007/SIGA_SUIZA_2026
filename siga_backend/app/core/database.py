from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import MetaData
from sqlalchemy.engine import make_url
from app.core.config import settings
import os
import ssl

# Metadata para el Core (solo identidad)
metadata = MetaData()
Base = declarative_base(metadata=metadata)


def _resolve_db_host() -> str:
    """Host real de la BD: prioriza DATABASE_URL (Railway) sobre DB_HOST."""
    try:
        return (make_url(settings.database_url).host or "").lower()
    except Exception:
        return (settings.DB_HOST or "").lower()


# SSL solo para BDs remotas con TLS. El PostgreSQL local y la red privada de
# Railway (*.railway.internal) no usan SSL.
# Regla: se activa SSL cuando el host es público (contiene un punto), salvo
# hosts internos conocidos. Se puede forzar con DB_SSL=true|false.
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE
_SSL_EXEMPT_HOSTS = ("localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres")


def _should_use_ssl(host: str) -> bool:
    override = os.getenv("DB_SSL", "").strip().lower()
    if override in ("1", "true", "yes", "on"):
        return True
    if override in ("0", "false", "no", "off"):
        return False
    if not host:
        return False
    if host in _SSL_EXEMPT_HOSTS or host.endswith(".railway.internal"):
        return False
    # Nombres de servicio de Docker (siga-postgres, db, ...) no llevan punto.
    return "." in host


_db_host = _resolve_db_host()
_use_ssl = _should_use_ssl(_db_host)
connect_args = {"ssl": _ssl_ctx} if _use_ssl else {}

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