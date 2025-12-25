from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import bcrypt

from .base_seeder import BaseSeeder
from ..models import CoreRole

class RoleSeeder(BaseSeeder):
    """Seeder para roles del sistema"""
    
    def get_dependencies(self) -> List[str]:
        return []  # No tiene dependencias
    
    async def should_run(self) -> bool:
        # Verificar si ya existen roles
        result = await self.db.execute(select(CoreRole))
        existing_roles = result.scalars().all()
        return len(existing_roles) == 0
    
    async def run(self):
        """Crea los roles básicos del sistema"""
        if not await self.should_run():
            self.log_warning("Roles ya existen, saltando...")
            return
        
        roles_data = [
            {"name": "admin", "description": "Administrador del sistema"},
            {"name": "docente", "description": "Docente"},
            {"name": "alumno", "description": "Alumno"},
            {"name": "director", "description": "Director de carrera"},
            {"name": "secretario", "description": "Secretario académico"}
        ]
        
        roles = []
        for role_data in roles_data:
            role = CoreRole(**role_data)
            roles.append(role)
            self.db.add(role)
        
        await self.db.commit()
        
        # Refrescar para obtener IDs
        for role in roles:
            await self.db.refresh(role)
        
        self.log_success(f"Creados {len(roles)} roles: {[r.name for r in roles]}")
        return roles