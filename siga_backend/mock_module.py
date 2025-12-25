#!/usr/bin/env python3
"""
Módulo Mock para pruebas del Gateway
Ejecutar: python mock_module.py
"""
from fastapi import FastAPI, Request
import uvicorn
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Mock Module")

@app.get("/")
async def root():
    return {
        "message": "✅ Módulo Demo funcionando",
        "module": "mod-demo", 
        "version": "1.0.0",
        "status": "active"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "module": "mod-demo"}

@app.get("/api/data")
async def get_data():
    return {
        "data": [1, 2, 3, 4, 5],
        "source": "mod-demo",
        "endpoint": "/api/data"
    }

@app.post("/api/items")
async def create_item(request: Request):
    body = await request.json()
    return {
        "message": "Item creado exitosamente",
        "item": body,
        "id": 123,
        "module": "mod-demo"
    }

@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    return {
        "user": {
            "id": user_id,
            "name": f"Usuario {user_id}",
            "module": "mod-demo"
        }
    }

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"📥 Mock Module: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"📤 Mock Module: {response.status_code}")
    return response

if __name__ == "__main__":
    print("🚀 Mock Module iniciado en http://localhost:8001")
    print("   Endpoints disponibles:")
    print("   • GET  /          - Root del módulo")
    print("   • GET  /health    - Health check") 
    print("   • GET  /api/data  - Datos de ejemplo")
    print("   • POST /api/items - Crear item")
    print("   • GET  /api/users/{id} - Obtener usuario")
    
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")