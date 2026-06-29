from fastapi import FastAPI
from routes import router
from database import init_db
import asyncio
from outbox_worker import outbox_worker
import os

app = FastAPI(
    title="mod-planes-estudio",
    description="Modulo de gestion de planes de estudio MINEDU",
    version="1.0.0"
)

app.include_router(router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "module": "mod-planes-estudio",
        "version": "1.0.0"
    }


@app.get("/manifest")
async def get_manifest():
    port = os.getenv("PORT", 8002)
    return {
        "name": "mod-planes-estudio",
        "version": "1.0.0",
        "api_version": "v1",
        "description": "Gestion de planes de estudio segun estandar MINEDU",
        "endpoints": {"http": f"http://localhost:{port}"},
        "health_check": "/health"
    }


@app.on_event("startup")
async def startup():
    await init_db()
    asyncio.create_task(outbox_worker())
    print("Modulo de Planes de Estudio iniciado")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
