import asyncio
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import AsyncSessionLocal, OutboxEvent

try:
    from nats.aio.client import Client as NATS
    NATS_AVAILABLE = True
except ImportError:
    NATS_AVAILABLE = False
    print("⚠️ NATS no está instalado. El Outbox Worker simulará la publicación.")

import os

NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")

async def outbox_worker():
    nc = None
    if NATS_AVAILABLE:
        nc = NATS()
        try:
            await nc.connect(NATS_URL)
            print(f"✅ Outbox Worker conectado a NATS: {NATS_URL}")
        except Exception as e:
            print(f"❌ Error conectando a NATS: {e}")
            nc = None

    while True:
        try:
            async with AsyncSessionLocal() as db:
                # Buscar eventos no publicados
                result = await db.execute(
                    select(OutboxEvent)
                    .where(OutboxEvent.published == False)
                    .order_by(OutboxEvent.created_at.asc())
                    .limit(50)
                )
                events = result.scalars().all()

                for event in events:
                    if nc:
                        try:
                            payload_bytes = json.dumps(event.payload).encode()
                            await nc.publish(event.event_type, payload_bytes)
                            event.published = True
                            await db.commit()
                        except Exception as e:
                            print(f"Error publicando evento {event.id}: {e}")
                    else:
                        print(f"🔄 [Simulado] Publicando evento {event.event_type}: {event.payload}")
                        event.published = True
                        await db.commit()
        except Exception as e:
            print(f"Error en Outbox Worker: {e}")
        
        await asyncio.sleep(2) # Polling interval
