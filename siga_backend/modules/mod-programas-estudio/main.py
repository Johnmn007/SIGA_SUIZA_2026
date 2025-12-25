from fastapi import FastAPI
import os
from routes import router

# Crear aplicación FastAPI
app = FastAPI(
    title="mod-programas-estudio",
    description="Módulo de gestión de programas de estudio",
    version="1.0.0"
)

# Incluir rutas
app.include_router(router, prefix="/api/v1")

# Endpoints de descubrimiento (SIN autenticación)
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
        "description": "Gestión de programas de estudio",
        "endpoints": {
            "http": f"http://localhost:{port}"
        },
        "health_check": "/health"
    }

# Sin verificación de BD al inicio - la conexión se prueba en los endpoints
@app.on_event("startup")
def startup_event():
    print("🚀 Módulo de Programas de Estudio iniciado")
    print("💡 La conexión a BD se verificará en el primer request")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8005))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )