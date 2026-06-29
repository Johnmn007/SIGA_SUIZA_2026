import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import bcrypt

# Setup path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.identity.models import CoreUser, CoreRole
from app.core.database import AsyncSessionLocal

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

async def main():
    async with AsyncSessionLocal() as db:
        users = [
            {
                "email": "secretaria_prog@siga.edu",
                "password": "secretariaprog123",
                "full_name": "Secretaría de Programa (Computación)",
                "role": "secretaria_programa",
            },
            {
                "email": "coordinador@siga.edu",
                "password": "coordinador123",
                "full_name": "Jefatura de Programa (Computación)",
                "role": "coordinador_programa",
            }
        ]

        for u in users:
            # Check if user exists
            res = await db.execute(select(CoreUser).where(CoreUser.email == u["email"]))
            user = res.scalar_one_or_none()
            if not user:
                # Get role
                res_role = await db.execute(select(CoreRole).where(CoreRole.name == u["role"]))
                role = res_role.scalar_one_or_none()
                if not role:
                    print(f"Role {u['role']} not found!")
                    continue
                
                new_user = CoreUser(
                    email=u["email"],
                    full_name=u["full_name"],
                    hashed_password=hash_password(u["password"]),
                    is_active=True,
                    is_superuser=False
                )
                new_user.roles.append(role)
                db.add(new_user)
                print(f"Added {u['email']}")
            else:
                print(f"User {u['email']} already exists")
        
        await db.commit()
        print("Done")

if __name__ == "__main__":
    asyncio.run(main())
