from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import MetaData
from app.core.config import settings

# Metadata para el Core (solo identidad)
metadata = MetaData()
Base = declarative_base(metadata=metadata)

# Engine asíncrono para el Core
engine = create_async_engine(settings.database_url, echo=settings.debug)

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