from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import json
import os
import uvicorn
from contextlib import asynccontextmanager

import sys
sys.path.append("/app")

is_published = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Módulo de Admisión", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_FILE_PATH = "/app/docs/mock_admision.json"

@app.get("/health")
async def health_check():
    return {"status": "ok", "module": "mod-admision"}

@app.get("/")
async def root():
    """
    Interfaz UI Piloto de Admisión.
    """
    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Panel de Control - Admisión</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
            .card {{ background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 500px; }}
            .btn {{ background-color: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; transition: background-color 0.2s; }}
            .btn:hover {{ background-color: #4338ca; }}
            .btn:disabled {{ background-color: #94a3b8; cursor: not-allowed; }}
            .status {{ margin-top: 20px; font-weight: 500; color: #15803d; }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1 style="color: #1e293b; margin-top:0;">Oficina de Admisión</h1>
            <p style="color: #64748b;">El proceso de admisión ha concluido. Presiona el botón para exponer la lista oficial de ingresantes para que el Sistema Integrado (SIGA) pueda consumirla.</p>
            <button id="pubBtn" class="btn" onclick="publicar()" {'disabled' if is_published else ''}>
                {"Resultados ya Publicados" if is_published else "Publicar Resultados de Admisión"}
            </button>
            <div id="status" class="status"></div>
        </div>
        <script>
            async function publicar() {{
                const btn = document.getElementById('pubBtn');
                btn.disabled = true;
                btn.innerText = "Publicando...";
                try {{
                    const res = await fetch('/publicar', {{ method: 'POST' }});
                    if(res.ok) {{
                        btn.innerText = "Resultados ya Publicados";
                        document.getElementById('status').innerText = "✅ Los resultados ahora son accesibles públicamente mediante el endpoint JSON.";
                    }} else {{
                        throw new Error("Error al publicar");
                    }}
                }} catch (e) {{
                    btn.disabled = false;
                    btn.innerText = "Publicar Resultados de Admisión";
                    alert(e.message);
                }}
            }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post("/publicar")
async def publicar_resultados():
    global is_published
    is_published = True
    return {"message": "Resultados publicados exitosamente."}

@app.get("/admitidos")
async def get_admitidos():
    """
    Retorna la lista masiva de estudiantes admitidos desde el archivo JSON piloto.
    """
    if not is_published:
        raise HTTPException(status_code=403, detail="Los resultados de admisión aún no han sido publicados.")
        
    if not os.path.exists(MOCK_FILE_PATH):
        raise HTTPException(status_code=404, detail="Archivo mock_admision.json no encontrado")
        
    try:
        with open(MOCK_FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo JSON: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8009)
