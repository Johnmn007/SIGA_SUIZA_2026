from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import MetaData
import os

# Configuración de la base de datos desde variables de entorno
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "john.007")
DB_NAME = os.getenv("DB_NAME", "mod_planes_estudio")

# Construir DATABASE_URL (síncrona)
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"🔗 Conectando a: {DB_HOST}:{DB_PORT}/{DB_NAME}")

# Metadata y Base para modelos
metadata = MetaData()
Base = declarative_base(metadata=metadata)

# Engine síncrono
engine = create_engine(DATABASE_URL, echo=True)

# Session local síncrona
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependencia de base de datos para FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
