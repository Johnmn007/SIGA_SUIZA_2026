import os

base_path = "D:/SIGA/siga_backend/modules/mod-admision"

# database.py
db_content = """from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
import os

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "john.007")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "siga_core")

DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
"""

# models.py
models_content = """from sqlalchemy import Column, Integer, String, JSON, Boolean
from database import Base

class PostulanteAdmitido(Base):
    __tablename__ = "admision_postulantes"

    id = Column(Integer, primary_key=True, index=True)
    dni = Column(String(20), unique=True, index=True)
    nombres = Column(String(100))
    apellidos = Column(String(100))
    programa_nombre = Column(String(150))
    modalidad_admision = Column(String(100))
    email = Column(String(150), nullable=True)
    celular = Column(String(20), nullable=True)
    fecha_nacimiento = Column(String(20), nullable=True)
    
    # Todos los demas campos del Excel
    metadata_admision = Column(JSON, default={})
    
    # Estado de sincronizacion con SIGA Core
    sincronizado = Column(Boolean, default=False)
"""

# main.py
main_content = """from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import json
import os
import uvicorn
from contextlib import asynccontextmanager
from io import BytesIO
import pandas as pd
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from database import engine, Base, get_db
from models import PostulanteAdmitido

import sys
sys.path.append("/app")

is_published = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="Módulo de Admisión", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "module": "mod-admision"}

@app.get("/")
async def root():
    html_content = \"\"\"
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Panel de Control - Admisión</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 550px; }
            .btn { background-color: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; transition: background-color 0.2s; margin-top: 15px;}
            .btn:hover { background-color: #4338ca; }
            .btn:disabled { background-color: #94a3b8; cursor: not-allowed; }
            .status { margin-top: 20px; font-weight: 500; color: #15803d; }
            .file-input-container { margin: 20px 0; padding: 20px; border: 2px dashed #cbd5e1; border-radius: 8px; background: #f1f5f9;}
        </style>
    </head>
    <body>
        <div class="card">
            <h1 style="color: #1e293b; margin-top:0;">Oficina de Admisión</h1>
            <p style="color: #64748b;">Carga el archivo Excel de resultados de admisión (ADMISION_2026.xlsx) para procesar e inyectar a los estudiantes en el sistema.</p>
            
            <form id="uploadForm">
                <div class="file-input-container">
                    <input type="file" id="excelFile" accept=".xlsx" required />
                </div>
                <button type="submit" id="pubBtn" class="btn">
                    Subir y Procesar Resultados
                </button>
            </form>
            <div id="status" class="status"></div>
        </div>
        <script>
            document.getElementById('uploadForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('pubBtn');
                const statusDiv = document.getElementById('status');
                const fileInput = document.getElementById('excelFile');
                
                if (!fileInput.files.length) return;
                
                btn.disabled = true;
                btn.innerText = "Procesando Excel...";
                statusDiv.innerText = "";
                
                const formData = new FormData();
                formData.append("file", fileInput.files[0]);
                
                try {
                    const res = await fetch('/api/mod-admision/upload', { 
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await res.json();
                    if(res.ok) {
                        btn.innerText = "¡Procesado Exitosamente!";
                        statusDiv.innerText = `✅ ${data.message}`;
                        statusDiv.style.color = '#15803d';
                    } else {
                        throw new Error(data.detail || "Error al procesar el archivo");
                    }
                } catch (err) {
                    btn.disabled = false;
                    btn.innerText = "Subir y Procesar Resultados";
                    statusDiv.innerText = `❌ ${err.message}`;
                    statusDiv.style.color = '#dc2626';
                }
            });
        </script>
    </body>
    </html>
    \"\"\"
    return HTMLResponse(content=html_content)


def sanitize_row(row):
    return {str(k): (None if pd.isna(v) else v) for k, v in row.items()}

@app.post("/api/mod-admision/upload")
async def upload_excel(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        contents = await file.read()
        excel_data = pd.ExcelFile(BytesIO(contents))
        
        if 'B_Datos' not in excel_data.sheet_names:
            raise HTTPException(status_code=400, detail="El Excel debe contener la hoja 'B_Datos'")
            
        # Parse B_Datos
        df_reg = pd.read_excel(excel_data, sheet_name='B_Datos')
        if df_reg.shape[1] > 38:
            df_reg = df_reg.iloc[:, :38]
        
        # Parse B_Datos_Exonerados
        df_exo = pd.DataFrame()
        if 'B_Datos_Exonerados' in excel_data.sheet_names:
            df_exo = pd.read_excel(excel_data, sheet_name='B_Datos_Exonerados')
            if df_exo.shape[1] > 40:
                df_exo = df_exo.iloc[:, :40]
        
        admitidos_list = []
        
        # Procesar Regulares
        for _, row in df_reg.iterrows():
            row_dict = sanitize_row(row)
            if not row_dict.get('NRO DE DOCUMENTO'):
                continue
                
            dni = str(row_dict.get('NRO DE DOCUMENTO', '')).replace('.0', '').strip()
            
            admitidos_list.append(PostulanteAdmitido(
                dni=dni,
                nombres=str(row_dict.get('NOMBRES', '')).strip(),
                apellidos=f"{row_dict.get('APELLIDO PATERNO', '')} {row_dict.get('APELLIDO MATERNO', '')}".strip(),
                programa_nombre=str(row_dict.get('PROGRAMA DE   ESTUDIOS', '')).strip(),
                modalidad_admision="ORDINARIO",
                email=str(row_dict.get('CORREO:', '')).strip() if row_dict.get('CORREO:') else None,
                celular=str(row_dict.get('CELULAR', '')).replace('.0', '').strip() if row_dict.get('CELULAR') else None,
                fecha_nacimiento=str(row_dict.get('FECHA NACIMIENTO: ', '')).strip() if row_dict.get('FECHA NACIMIENTO: ') else None,
                metadata_admision=row_dict
            ))
            
        # Procesar Exonerados
        for _, row in df_exo.iterrows():
            row_dict = sanitize_row(row)
            if not row_dict.get('NRO DE DOCUMENTO'):
                continue
                
            dni = str(row_dict.get('NRO DE DOCUMENTO', '')).replace('.0', '').strip()
            modalidad = str(row_dict.get('MODALIDAD', 'EXONERADO')).strip()
            
            # Quitar NRO, MODALIDAD, PUESTO/PROCEDENCIA del row dict para que quede igual que el otro
            # o dejarlo, al fin y al cabo es metadata. Lo dejamos.
            
            admitidos_list.append(PostulanteAdmitido(
                dni=dni,
                nombres=str(row_dict.get('NOMBRES', '')).strip(),
                apellidos=f"{row_dict.get('APELLIDO PATERNO', '')} {row_dict.get('APELLIDO MATERNO', '')}".strip(),
                programa_nombre=str(row_dict.get('PROGRAMA DE   ESTUDIOS', '')).strip(),
                modalidad_admision=modalidad,
                email=str(row_dict.get('CORREO:', '')).strip() if row_dict.get('CORREO:') else None,
                celular=str(row_dict.get('CELULAR', '')).replace('.0', '').strip() if row_dict.get('CELULAR') else None,
                fecha_nacimiento=str(row_dict.get('FECHA NACIMIENTO: ', '')).strip() if row_dict.get('FECHA NACIMIENTO: ') else None,
                metadata_admision=row_dict
            ))
            
        # Limpiar tabla e insertar
        await db.execute(delete(PostulanteAdmitido))
        db.add_all(admitidos_list)
        await db.commit()
        
        global is_published
        is_published = True
        
        return {"message": f"Se procesaron {len(admitidos_list)} estudiantes exitosamente. Resultados publicados."}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admitidos")
async def get_admitidos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PostulanteAdmitido))
    records = result.scalars().all()
    
    # Formateamos para el core
    formatted = []
    
    # Mapping simplificado para el programa_id temporal (el core deberia mapear, pero para MVP enviamos un fallback id)
    # 2 es Enfermeria, 11 es Arquitectura, etc. (El core hace un fallback robusto ahora)
    program_mapping = {
        "ENFERMERÍA TÉCNICA": 2,
        "ASISTENCIA ADMINISTRATIVA": 6,
        "CONTABILIDAD": 5,
        "MECATRÓNICA AUTOMOTRIZ": 7,
        "ADMINISTRACIÓN DE OPERACIONES TURÍSTICAS": 9
    }
    
    for r in records:
        prog_name_upper = r.programa_nombre.upper()
        # Tratamos de sacar un ID aproximado o usamos 1
        prog_id = 1
        for k,v in program_mapping.items():
            if k in prog_name_upper or prog_name_upper in k:
                prog_id = v
                break
                
        formatted.append({
            "dni": r.dni,
            "nombres": r.nombres,
            "apellidos": r.apellidos,
            "programa_id": prog_id, 
            "celular": r.celular,
            "email_personal": r.email,
            "fecha_nacimiento": r.fecha_nacimiento,
            "modalidad": r.modalidad_admision,
            "metadata_completa": r.metadata_admision
        })
        
    return {"admitidos": formatted}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8009)
"""

with open(f"{base_path}/database.py", "w", encoding="utf-8") as f:
    f.write(db_content)

with open(f"{base_path}/models.py", "w", encoding="utf-8") as f:
    f.write(models_content)

with open(f"{base_path}/main.py", "w", encoding="utf-8") as f:
    f.write(main_content)

print("mod-admision scaffolded successfully")
