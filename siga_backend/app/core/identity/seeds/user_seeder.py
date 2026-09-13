from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any
import bcrypt

from .base_seeder import BaseSeeder
from ..models import CoreUser, CoreRole
from ...config import settings

class UserSeeder(BaseSeeder):
    """Seeder para usuarios del sistema.

    Solo se ejecuta con ENVIRONMENT=development. Estas cuentas tienen
    contrasenas triviales y publicas (docs/06-CREDENCIALES-PRUEBA.md); crearlas
    fuera de desarrollo dejaria el sistema con un superadmin de clave conocida.
    """

    def get_dependencies(self) -> List[str]:
        return ["RoleSeeder", "PermissionSeeder"]

    async def should_run(self) -> bool:
        if settings.environment.lower() != "development":
            return False
        result = await self.db.execute(select(CoreUser))
        existing_users = result.scalars().all()
        return len(existing_users) == 0

    async def run(self) -> List[CoreUser]:
        """Crea usuarios iniciales del sistema"""
        if not await self.should_run():
            if settings.environment.lower() != "development":
                self.log_warning(
                    f"ENVIRONMENT={settings.environment}: no se siembran usuarios de prueba"
                )
            else:
                self.log_warning("Usuarios ya existen, saltando...")
            return []

        # Obtener roles CON la sesión activa
        result = await self.db.execute(select(CoreRole))
        roles = {role.name: role for role in result.scalars().all()}
        
        users_data = [
            {
                "email": "admin@siga.edu",
                "password": "admin123",
                "full_name": "Super Admin",
                "roles": ["superadmin"],
                "is_superuser": True
            },
            {
                "email": "tesoreria@siga.edu",
                "password": "tesoreria123",
                "full_name": "Caja Principal",
                "roles": ["caja_tesoreria"],
                "is_superuser": False
            },
            {
                "email": "secretaria@siga.edu",
                "password": "secretaria123",
                "full_name": "Secretaría Académica",
                "roles": ["secretaria_academica"],
                "is_superuser": False
            },
            {
                "email": "secretaria_prog@siga.edu",
                "password": "secretariaprog123",
                "full_name": "Secretaría de Programa (Computación)",
                "roles": ["secretaria_programa"],
                "is_superuser": False
            },
            {
                "email": "coordinador@siga.edu",
                "password": "coordinador123",
                "full_name": "Jefatura de Programa (Computación)",
                "roles": ["coordinador_programa"],
                "is_superuser": False
            },
            {
                "email": "admision@siga.edu",
                "password": "admision123",
                "full_name": "Oficina de Admisión",
                "roles": ["oficina_admision"],
                "is_superuser": False
            },
            {
                "email": "docente@siga.edu", 
                "password": "docente123",
                "full_name": "Docente Titular",
                "roles": ["docente"],
                "is_superuser": False
            },
            {
                "email": "estudiante@siga.edu",
                "password": "estudiante123", 
                "full_name": "Estudiante Promedio",
                "roles": ["estudiante"],
                "is_superuser": False
            }
        ]
        
        created_users = []
        user_roles_info = []  # Para guardar info de roles SIN acceder a relaciones lazy
        
        for user_data in users_data:
            # Hash password
            hashed_password = bcrypt.hashpw(
                user_data["password"].encode('utf-8'), 
                bcrypt.gensalt()
            ).decode('utf-8')
            
            # Crear usuario
            user = CoreUser(
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=hashed_password,
                is_active=True,
                is_superuser=user_data["is_superuser"]
            )
            
            # Asignar roles y guardar info para logging
            assigned_roles = []
            for role_name in user_data["roles"]:
                if role_name in roles:
                    user.roles.append(roles[role_name])
                    assigned_roles.append(role_name)
            
            self.db.add(user)
            created_users.append(user)
            user_roles_info.append((user_data["email"], assigned_roles))
        
        await self.db.commit()
        
        # 🆕 EVITAR ACCEDER A RELACIONES LAZY - Usar la info que ya tenemos
        self.log_success(f"Creados {len(created_users)} usuarios")
        for email, roles_list in user_roles_info:
            self.log_success(f"  👤 {email} - Roles: {roles_list}")
        
        return created_users