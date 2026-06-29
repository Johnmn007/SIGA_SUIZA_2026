import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.identity.models import Base, CoreRole, CorePermission, CoreUser
from app.core.database import engine, AsyncSessionLocal
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

async def seed_users():
    async with AsyncSessionLocal() as db:
        users_data = [
            {"email": "secretaria@siga.edu.pe", "full_name": "Ana Perez (Secretaria)", "role": "secretaria_academica"},
            {"email": "docente@siga.edu.pe", "full_name": "Carlos Gomez (Docente)", "role": "docente"},
            {"email": "estudiante@siga.edu.pe", "full_name": "Juan Lopez (Estudiante)", "role": "estudiante"},
            {"email": "coordinador@siga.edu.pe", "full_name": "Miguel Torres (Jefe de Área Académica)", "role": "coordinador_programa"}
        ]
        
        for u_data in users_data:
            existing = await db.execute(select(CoreUser).where(CoreUser.email == u_data["email"]))
            user = existing.scalar_one_or_none()
            if not user:
                role_query = await db.execute(select(CoreRole).where(CoreRole.name == u_data["role"]))
                role = role_query.scalar_one_or_none()
                if role:
                    user = CoreUser(
                        email=u_data["email"],
                        full_name=u_data["full_name"],
                        hashed_password=hash_password("123456"),
                        is_active=True
                    )
                    user.roles.append(role)
                    db.add(user)
        
        await db.commit()
        print("Test users seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_users())
