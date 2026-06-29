import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.identity.models import Base, CoreRole, CorePermission, CoreUser
from app.core.database import engine, AsyncSessionLocal

async def seed_roles():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as db:
        roles_data = [
            {"name": "director", "description": "Director General"},
            {"name": "coordinador_programa", "description": "Coordinador de Programa de Estudio"},
            {"name": "secretaria_academica", "description": "Secretaría Académica"},
            {"name": "admin_admision", "description": "Responsable de Admisión"},
            {"name": "tesoreria", "description": "Tesorería / Caja"},
            {"name": "bienestar", "description": "Bienestar Estudiantil"},
            {"name": "docente", "description": "Docente"},
            {"name": "estudiante", "description": "Estudiante Regular"},
            {"name": "egresado", "description": "Egresado / Titulado"},
            {"name": "superadmin", "description": "Administrador TI"}
        ]
        
        for role_dict in roles_data:
            existing = await db.execute(select(CoreRole).where(CoreRole.name == role_dict["name"]))
            if not existing.scalar_one_or_none():
                db.add(CoreRole(**role_dict))
                
        await db.commit()
        print("Roles seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_roles())
