import asyncio
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.identity.models import Base, CoreRole, CorePermission, CoreUser
from app.core.database import engine, AsyncSessionLocal
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

USERS_DATA = [
    {"email": "admin@siga.edu", "full_name": "Super Admin", "role": "superadmin", "is_superuser": True, "password": "admin123"},
    {"email": "secretaria@siga.edu", "full_name": "Ana Perez (Secretaria)", "role": "secretaria_academica", "password": "secretaria123"},
    {"email": "secretaria_prog@siga.edu", "full_name": "Maria Garcia (Secretaria Programa)", "role": "secretaria_programa", "password": "secretariaprog123"},
    {"email": "docente@siga.edu", "full_name": "Carlos Gomez (Docente)", "role": "docente", "password": "docente123"},
    {"email": "coordinador@siga.edu", "full_name": "Miguel Torres (Coordinador)", "role": "coordinador_programa", "password": "coordinador123"},
    {"email": "estudiante@siga.edu", "full_name": "Juan Lopez (Estudiante)", "role": "estudiante", "password": "estudiante123"},
    {"email": "director@siga.edu", "full_name": "Dr. Roberto Sanchez (Director)", "role": "director", "password": "director123"},
    {"email": "tesoreria@siga.edu", "full_name": "Laura Martinez (Caja)", "role": "caja_tesoreria", "password": "tesoreria123"},
]

async def seed_users():
    async with AsyncSessionLocal() as db:
        for u_data in USERS_DATA:
            existing = await db.execute(select(CoreUser).where(CoreUser.email == u_data["email"]))
            user = existing.scalar_one_or_none()
            if not user:
                role_query = await db.execute(select(CoreRole).where(CoreRole.name == u_data["role"]))
                role = role_query.scalar_one_or_none()
                if not role:
                    role = CoreRole(name=u_data["role"], description=f"Rol {u_data['role']}")
                    db.add(role)
                    await db.flush()

                user = CoreUser(
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    hashed_password=hash_password(u_data["password"]),
                    is_active=True,
                    is_superuser=u_data.get("is_superuser", False)
                )
                user.roles.append(role)
                db.add(user)
                print(f"  + Usuario creado: {u_data['email']} ({u_data['role']})")
            else:
                print(f"  = Ya existe: {u_data['email']}")

        await db.commit()
        print("\nSeed de usuarios completado.")

if __name__ == "__main__":
    asyncio.run(seed_users())
