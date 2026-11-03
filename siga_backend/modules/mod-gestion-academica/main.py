from fastapi import FastAPI
import os
from routes import router
from matricula_routes import router as matricula_router
from tesoreria_routes import router as tesoreria_router, asegurar_esquema_tesoreria
from database import init_db
import asyncio
from outbox_worker import outbox_worker

app = FastAPI(title="SIGA - Gestión Académica", version="2.0.0")

app.include_router(router)
app.include_router(matricula_router)
app.include_router(tesoreria_router)

@app.get("/")
async def root():
    return {"message": "API Gestión Académica Operativa"}

@app.get("/health")
async def health():
    return {"status": "healthy", "module": "mod-gestion-academica"}

@app.get("/manifest")
async def get_manifest():
    port = os.getenv("PORT", 8006)
    return {
        "name": "mod-gestion-academica",
        "version": "2.0.0",
        "api_version": "v1",
        "endpoints": {"http": f"http://localhost:{port}"},
        "health_check": "/health"
    }

@app.on_event("startup")
async def startup():
    await init_db()
    await asegurar_esquema_tesoreria()
    asyncio.create_task(outbox_worker())

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8006))
    uvicorn.run(app, host="0.0.0.0", port=port)
