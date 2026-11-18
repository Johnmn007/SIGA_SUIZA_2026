from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import MetaData
from app.core.config import settings
import os
import sys
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, String, JSON, Boolean

# Usar la DATABASE_URL centralizada desde config.py
DATABASE_URL = settings.database_url

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

_is_test = (os.getenv("DB_NAME") == "siga_test") or ("pytest" in sys.modules)

_engine_kwargs = {}
if _is_test:
    _engine_kwargs["poolclass"] = NullPool
    _engine_kwargs["echo"] = False
else:
    _engine_kwargs["echo"] = False

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        except BaseException:
            await db.rollback()
            raise
        finally:
            await db.close()

async def init_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        print("Tablas creadas/verificadas")
    except Exception as e:
        print(f"init_db: tablas ya existen o error menor: {e}")