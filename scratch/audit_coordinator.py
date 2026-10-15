import os, sys, asyncio
sys.path.insert(0, os.path.abspath("siga_backend/modules/mod-programas-estudio"))

os.environ["DB_HOST"] = "localhost"
os.environ["DB_PORT"] = "5433"
os.environ["DB_USER"] = "postgres"
os.environ["DB_PASSWORD"] = "admin123"
os.environ["DB_NAME"] = "siga_core"

import httpx
from main import app

async def audit_endpoints():
    print("================ AUDITORIA DE ENDPOINTS DEL COORDINADOR ================")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", follow_redirects=True) as client:
        # 1. Carga Lectiva
        res1 = await client.get("/programas/15/carga-lectiva?periodo_id=15")
        print(f"1. GET /programas/15/carga-lectiva -> Status: {res1.status_code}")

        # 2. Horarios
        res2 = await client.get("/programas/15/horarios?periodo_id=15")
        print(f"2. GET /programas/15/horarios -> Status: {res2.status_code}")

        # 3. Sílabos
        res3 = await client.get("/programas/15/silabos?periodo_id=15")
        print(f"3. GET /programas/15/silabos -> Status: {res3.status_code}")

        # 4. Planes de trabajo
        res4 = await client.get("/programas/15/planes-trabajo?periodo_id=15")
        print(f"4. GET /programas/15/planes-trabajo -> Status: {res4.status_code}")

        # 5. Tutorías GET
        res5 = await client.get("/programas/15/tutorias?periodo_id=15")
        print(f"5. GET /programas/15/tutorias -> Status: {res5.status_code}")

        # 6. Probar creación de Tutoría (como lo manda el frontend)
        tutoria_payload = {
            "periodo_id": 15,
            "docente_id": 9,
            "ciclo": 1,
            "observaciones": "Tutor de prueba"
        }
        res6 = await client.post("/programas/15/tutorias", json=tutoria_payload)
        print(f"6. POST /programas/15/tutorias -> Status: {res6.status_code}, Body: {res6.text}")

        # 7. Probar eliminación de carga lectiva (si existe endpoint)
        res7 = await client.delete("/programas/15/carga-lectiva/9")
        print(f"7. DELETE /programas/15/carga-lectiva/9 -> Status: {res7.status_code}")

if __name__ == "__main__":
    asyncio.run(audit_endpoints())
