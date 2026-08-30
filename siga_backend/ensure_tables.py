import asyncio
from app.core.database import engine, Base

import app.core.identity.models  # noqa: F401  (registra core_users/roles/permisos y tablas M2M)
import app.core.registry.models  # noqa: F401  (registra core_modules)


async def ensure():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tablas faltantes creadas (verificadas por create_all)")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(ensure())
