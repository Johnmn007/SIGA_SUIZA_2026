from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Depends
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
    html_content = """
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
    """
    return HTMLResponse(content=html_content)


def sanitize_row(row):
    result = {}
    for k, v in row.items():
        if pd.isna(v):
            result[str(k)] = None
        elif isinstance(v, pd.Timestamp):
            result[str(k)] = v.isoformat()
        else:
            result[str(k)] = v
    return result

from starlette.concurrency import run_in_threadpool

def parse_excel_sync(contents: bytes):
    excel_data = pd.ExcelFile(BytesIO(contents))
    
    if 'B_Datos' not in excel_data.sheet_names:
        raise ValueError("El Excel debe contener la hoja 'B_Datos'")
        
    df_reg = pd.read_excel(excel_data, sheet_name='B_Datos')
    if df_reg.shape[1] > 38:
        df_reg = df_reg.iloc[:, :38]
    
    df_exo = pd.DataFrame()
    if 'B_Datos_Exonerados' in excel_data.sheet_names:
        df_exo = pd.read_excel(excel_data, sheet_name='B_Datos_Exonerados')
        if df_exo.shape[1] > 40:
            df_exo = df_exo.iloc[:, :40]
            
    admitidos_list = []
    
    for _, row in df_reg.iterrows():
        row_dict = sanitize_row(row)
        if not row_dict.get('NRO DE DOCUMENTO'): continue
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
        
    for _, row in df_exo.iterrows():
        row_dict = sanitize_row(row)
        if not row_dict.get('NRO DE DOCUMENTO'): continue
        dni = str(row_dict.get('NRO DE DOCUMENTO', '')).replace('.0', '').strip()
        modalidad = str(row_dict.get('MODALIDAD', 'EXONERADO')).strip()
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
        
    return admitidos_list

@app.post("/api/mod-admision/upload")
async def upload_excel(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    try:
        contents = await file.read()
        try:
            admitidos_list = await run_in_threadpool(parse_excel_sync, contents)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
            
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
    # Mapeo exacto alineado con los IDs del frontend (1=Arquitectura/Sistemas, 2=Enfermeria, 4=Administracion, 5=Contabilidad, 6=Mecatronica)
    program_mapping = {
        "DESARROLLO DE SISTEMAS DE INFORMACIÓN": 1,
        "ENFERMERÍA TÉCNICA": 2,
        "GESTIÓN ADMINISTRATIVA": 4,
        "ASISTENCIA ADMINISTRATIVA": 4,
        "CONTABILIDAD": 5,
        "MECATRÓNICA AUTOMOTRIZ": 6,
        "ELECTRICIDAD INDUSTRIAL": 7,
        "ADMINISTRACIÓN DE OPERACIONES TURÍSTICAS": 8,
        "CONSTRUCCIÓN CIVIL": 9,
        "PRODUCCIÓN AGROPECUARIA": 10,
        "MANEJO FORESTAL": 11
    }
    
    for r in records:
        prog_name_upper = r.programa_nombre.upper()
        # Fallback a 99 (Desconocido) en lugar de 1, para no mezclar con Sistemas
        prog_id = 99
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
