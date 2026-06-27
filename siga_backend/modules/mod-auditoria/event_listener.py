import asyncio
import os
import json
from nats.aio.client import Client as NATS
from database import AsyncSessionLocal
from models import AuditLog

NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")

async def process_audit_event(msg):
    try:
        data = json.loads(msg.data.decode())
        print(f"[AUDITORIA] Recibido evento: {data.get('event_type')}")
        
        async with AsyncSessionLocal() as db:
            # Check if event already processed to achieve idempotency
            from sqlalchemy import select
            existing = await db.execute(select(AuditLog).where(AuditLog.event_id == data.get("event_id")))
            if existing.scalar_one_or_none():
                print(f"[AUDITORIA] Evento {data.get('event_id')} duplicado. Ignorando.")
                return

            audit_log = AuditLog(
                event_id=data.get("event_id"),
                event_type=data.get("event_type"),
                source=data.get("source"),
                payload=data.get("data", {}),
                user_id=data.get("metadata", {}).get("user_id"),
                request_id=data.get("metadata", {}).get("request_id")
            )
            db.add(audit_log)
            await db.commit()
            print(f"[AUDITORIA] Evento {data.get('event_id')} registrado correctamente.")

    except Exception as e:
        print(f"[AUDITORIA] Error procesando evento: {e}")

async def start_listener():
    nc = NATS()
    try:
        await nc.connect(NATS_URL)
        print(f"[AUDITORIA] Conectado a NATS en {NATS_URL}")
        
        # Suscribirse a todos los eventos (*.*.*)
        await nc.subscribe("*.*.*", cb=process_audit_event, queue="auditoria_queue")
        
        # Mantener el listener vivo
        while True:
            await asyncio.sleep(1)
    except Exception as e:
        print(f"[AUDITORIA] Error en NATS listener: {e}")
    finally:
        if nc.is_connected:
            await nc.close()

if __name__ == "__main__":
    asyncio.run(start_listener())
