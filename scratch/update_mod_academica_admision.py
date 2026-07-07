import os
import asyncio
import re

base_path = "D:/SIGA/siga_backend/modules/mod-gestion-academica"

# 1. Update models.py
models_path = f"{base_path}/models.py"
with open(models_path, "r", encoding="utf-8") as f:
    models_content = f.read()

if "modalidad_admision" not in models_content:
    old_col = "fecha_limite_documentos = Column(TIMESTAMP)"
    new_cols = "fecha_limite_documentos = Column(TIMESTAMP)\n    modalidad_admision = Column(String(100), default=\"ORDINARIO\")\n    metadata_admision = Column(JSON, default={})"
    models_content = models_content.replace(old_col, new_cols)
    # Add JSON import if missing
    if "JSON" not in models_content.splitlines()[0]:
        models_content = models_content.replace("from sqlalchemy import Column,", "from sqlalchemy import Column, JSON,")
    with open(models_path, "w", encoding="utf-8") as f:
        f.write(models_content)
    print("models.py updated.")

# 2. Update schemas.py
schemas_path = f"{base_path}/schemas.py"
with open(schemas_path, "r", encoding="utf-8") as f:
    schemas_content = f.read()

if "modalidad_admision" not in schemas_content:
    old_fields = "fecha_limite_documentos: Optional[datetime] = None"
    new_fields = "fecha_limite_documentos: Optional[datetime] = None\n    modalidad_admision: Optional[str] = \"ORDINARIO\"\n    metadata_admision: Optional[dict] = {}"
    schemas_content = schemas_content.replace(old_fields, new_fields)
    
    # also update Admitido schema
    old_admitido = "email_personal: Optional[str] = None"
    new_admitido = "email_personal: Optional[str] = None\n    modalidad: Optional[str] = \"ORDINARIO\"\n    metadata_completa: Optional[dict] = {}"
    schemas_content = schemas_content.replace(old_admitido, new_admitido)
    with open(schemas_path, "w", encoding="utf-8") as f:
        f.write(schemas_content)
    print("schemas.py updated.")

# 3. Update routes.py
routes_path = f"{base_path}/routes.py"
with open(routes_path, "r", encoding="utf-8") as f:
    routes_content = f.read()

if "modalidad_admision" not in routes_content:
    old_creation = """        db_estudiante = Estudiante(
            codigo_estudiante=codigo,
            dni=admitido.dni,
            nombres=admitido.nombres,
            apellidos=admitido.apellidos,
            programa_id=admitido.programa_id,
            celular=admitido.celular,
            email_personal=admitido.email_personal
        )"""
    new_creation = """        db_estudiante = Estudiante(
            codigo_estudiante=codigo,
            dni=admitido.dni,
            nombres=admitido.nombres,
            apellidos=admitido.apellidos,
            programa_id=admitido.programa_id,
            celular=admitido.celular,
            email_personal=admitido.email_personal,
            modalidad_admision=admitido.modalidad,
            metadata_admision=admitido.metadata_completa
        )"""
    routes_content = routes_content.replace(old_creation, new_creation)
    with open(routes_path, "w", encoding="utf-8") as f:
        f.write(routes_content)
    print("routes.py updated.")

# 4. Alter table
async def alter_table():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "john.007")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "siga_core")
    
    DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE estudiantes ADD COLUMN modalidad_admision VARCHAR(100) DEFAULT 'ORDINARIO';"))
            print("Added modalidad_admision column.")
        except Exception as e:
            print(f"modalidad_admision might already exist: {e}")
            
        try:
            await conn.execute(text("ALTER TABLE estudiantes ADD COLUMN metadata_admision JSONB DEFAULT '{}'::jsonb;"))
            print("Added metadata_admision column.")
        except Exception as e:
            print(f"metadata_admision might already exist: {e}")

if __name__ == "__main__":
    asyncio.run(alter_table())
    print("Done")
