from fastapi import FastAPI
import os
import sys
from pathlib import Path

# Asegurar que la raíz del backend (/app o siga_backend) esté en sys.path para imports compartidos
_app_root = str(Path(__file__).resolve().parent.parent.parent)
if _app_root not in sys.path:
    sys.path.insert(0, _app_root)

from routes import router
from database import init_db
import asyncio
from outbox_worker import outbox_worker

app = FastAPI(title="SIGA - Evaluación", version="1.0.0")

app.include_router(router)

@app.get("/")
async def root():
    return {"message": "API Evaluación Operativa"}

@app.get("/health")
async def health():
    return {"status": "healthy", "module": "mod-evaluacion"}

@app.get("/manifest")
async def get_manifest():
    port = os.getenv("PORT", 8008)
    return {
        "name": "mod-evaluacion",
        "version": "1.0.0",
        "api_version": "v1",
        "endpoints": {"http": f"http://mod-evaluacion:{port}"},
        "health_check": "/health"
    }

@app.on_event("startup")
async def startup():
    await init_db()
    asyncio.create_task(outbox_worker())

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8008))
    uvicorn.run(app, host="0.0.0.0", port=port)
