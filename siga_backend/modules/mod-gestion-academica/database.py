from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import MetaData
import os
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, String, JSON, Boolean

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME", "mod_gestion_academica")

DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

metadata = MetaData()
Base = declarative_base(metadata=metadata)

class TimeStampedMixin:
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class BaseModel(Base, TimeStampedMixin):
    __abstract__ = True
    id = Column(Integer, primary_key=True, index=True)

class OutboxEvent(BaseModel):
    __tablename__ = "outbox_events"
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    published = Column(Boolean, default=False, index=True)

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()

async def ensure_schema():
    """Añade de forma idempotente las columnas del proceso de matrícula.

    ``Base.metadata.create_all`` crea tablas nuevas pero NO altera tablas
    existentes, por lo que las columnas agregadas al motor de matrícula se
    aplican aquí con ``ADD COLUMN IF NOT EXISTS`` (no destructivo).
    """
    from sqlalchemy import text

    sentencias = [
        "ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS plan_estudios_id INTEGER",
        "ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS ciclo_actual INTEGER DEFAULT 1",
        "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS ciclo INTEGER",
        "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS casuistica VARCHAR(50)",
        "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS boleta_codigo VARCHAR(64)",
        "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS boleta_emitida_en TIMESTAMP",
        "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS consolidada BOOLEAN DEFAULT FALSE",
        "ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS registro_academico VARCHAR(50)",
    ]
    async with engine.begin() as conn:
        for sentencia in sentencias:
            await conn.execute(text(sentencia))
    print("Esquema de matrícula verificado/actualizado")


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_schema()
    print("Tablas creadas/verificadas")
