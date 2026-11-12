import sys
import os

# Agregar al path
sys.path.insert(0, r'D:\CURSOS D.S.I ( VI )\TALLER DE PROGRAMACION WEB\PROYECTO\SIGA_SUIZA_2026\siga_backend\modules\mod-usuarios')

# Cambiar al directorio
os.chdir(r'D:\CURSOS D.S.I ( VI )\TALLER DE PROGRAMACION WEB\PROYECTO\SIGA_SUIZA_2026\siga_backend\modules\mod-usuarios')

# Importar módulo
from database import get_db
from models import Usuario, PerfilPersonal, Rol
from sqlalchemy import select
import bcrypt
import asyncio

async def test():
    async for db in get_db():
        email = 'personal@test.edu'
        hashed = bcrypt.hashpw(b'Password123', bcrypt.gensalt()).decode('utf-8')
        db_user = Usuario(
            email=email,
            full_name='Personal de Prueba',
            hashed_password=hashed,
            is_active=True,
            is_superuser=False
        )
        db.add(db_user)
        await db.flush()
        
        # Verificar rol
        roles_result = await db.execute(select(Rol).where(Rol.name.in_(['docente'])))
        roles = roles_result.scalars().all()
        print(f'Roles encontrados: {len(roles)}')
        for r in roles:
            print(f'  - {r.name}')

asyncio.run(test())