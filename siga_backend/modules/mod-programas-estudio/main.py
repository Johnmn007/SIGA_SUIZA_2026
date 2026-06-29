from fastapi import FastAPI
import os
from routes import router
from database import init_db
import asyncio
from outbox_worker import outbox_worker

app = FastAPI(
    title="mod-programas-estudio",
    description="Modulo de gestion de programas de estudio",
    version="1.0.0"
)

app.include_router(router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "module": "mod-programas-estudio",
        "version": "1.0.0"
    }


@app.get("/manifest")
async def get_manifest():
    port = os.getenv("PORT", 8005)
    return {
        "name": "mod-programas-estudio",
        "version": "1.0.0",
        "api_version": "v1",
        "description": "Gestion de programas de estudio",
        "endpoints": {"http": f"http://localhost:{port}"},
        "health_check": "/health"
    }


@app.on_event("startup")
async def startup():
    await init_db()
    asyncio.create_task(outbox_worker())
    print("Tablas creadas/verificadas")
    print("Modulo de Programas de Estudio iniciado")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8005))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
