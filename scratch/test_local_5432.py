import os, sys, asyncio
sys.path.insert(0, os.path.abspath("siga_backend/modules/mod-programas-estudio"))

os.environ["DB_HOST"] = "localhost"
os.environ["DB_PORT"] = "5432"
os.environ["DB_USER"] = "postgres"
os.environ["DB_PASSWORD"] = "admin123"
os.environ["DB_NAME"] = "siga_core"

import httpx
from main import app

async def test_coordinator_local_db():
    print("Probando conexión del Backend al PostgreSQL local (admin123 en puerto 5432)...")
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", follow_redirects=True) as client:
        # 1. Health check
        res_health = await client.get("/health")
        print(f"GET /health -> Status: {res_health.status_code}, Body: {res_health.json()}")

        # 2. Listar programas
        res_prog = await client.get("/programas")
        print(f"GET /programas -> Status: {res_prog.status_code}, Programas: {res_prog.json()}")

        # 3. Listar carga lectiva (Coordinador)
        res_carga = await client.get("/programas/15/carga-lectiva?periodo_id=15")
        print(f"GET /programas/15/carga-lectiva -> Status: {res_carga.status_code}, Total Cargas: {len(res_carga.json())}")

    print("\n[OK] El backend se conectó exitosamente a tu PostgreSQL local en el puerto 5432.")

if __name__ == "__main__":
    asyncio.run(test_coordinator_local_db())
