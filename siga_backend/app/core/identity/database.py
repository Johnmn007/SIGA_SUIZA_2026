from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base  # 👈 AGREGAR declarative_base aquí
from sqlalchemy import MetaData
from ..config import settings

# Metadata específica para Identity (separada del Core)
metadata = MetaData()
Base = declarative_base(metadata=metadata)

# Engine para Identity (misma DB pero schema separado)
engine = create_async_engine(settings.database_url, echo=settings.debug)

# Session local para Identity
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_identity_db():
    """Dependencia de base de datos para Identity"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()