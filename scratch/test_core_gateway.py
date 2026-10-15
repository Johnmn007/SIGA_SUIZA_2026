import os, sys, asyncio
sys.path.insert(0, os.path.abspath("siga_backend"))

os.environ["DB_HOST"] = "localhost"
os.environ["DB_PORT"] = "5432"
os.environ["DB_USER"] = "postgres"
os.environ["DB_PASSWORD"] = "admin123"
os.environ["DB_NAME"] = "siga_core"
os.environ["ENABLE_NATS"] = "False"

import httpx
from app.main import app

async def test_core_gateway():
    print("Probando Core Gateway con PostgreSQL local...")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        print(f"Core Gateway GET /health -> Status: {res.status_code}, Body: {res.json()}")

    print("[OK] Core Gateway listo.")

if __name__ == "__main__":
    asyncio.run(test_core_gateway())
