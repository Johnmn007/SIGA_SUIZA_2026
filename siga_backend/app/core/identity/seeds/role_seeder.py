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
            {"name": "superadmin", "description": "Administrador de TI"},
            {"name": "tesoreria", "description": "Caja y Finanzas"},
            {"name": "secretaria_academica", "description": "Secretaría Central"},
            {"name": "secretaria_programa", "description": "Secretaría de Programa de Estudios"},
            {"name": "coordinador_programa", "description": "Coordinador de Programa de Estudios"},
            {"name": "admin_admision", "description": "Gestor de Admisiones"},
            {"name": "docente", "description": "Docente"},
            {"name": "estudiante", "description": "Estudiante Regular"}
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