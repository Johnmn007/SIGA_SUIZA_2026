import asyncio
from app.core.database import engine, Base
from app.core.registry.models import CoreModule

async def create_tables():
    print("Creando tablas del core_modules...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tablas creadas exitosamente.")

if __name__ == "__main__":
    asyncio.run(create_tables())
