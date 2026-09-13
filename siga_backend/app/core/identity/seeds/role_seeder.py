from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from .base_seeder import BaseSeeder
from ..models import CoreRole

# Los nombres tienen que coincidir exactamente con los que comprueba el
# frontend en App.jsx / DashboardLayout.jsx para elegir la vista por defecto
# y el menu. Antes este seeder creaba "tesoreria" y "admin_admision", que no
# coinciden con "caja_tesoreria" y "oficina_admision" que espera el frontend
# (y que es lo que sembraba reset.sql a mano).
ROLES = [
    {"name": "superadmin", "description": "Administrador de TI"},
    {"name": "caja_tesoreria", "description": "Caja y Tesoreria"},
    {"name": "secretaria_academica", "description": "Secretaria Central"},
    {"name": "secretaria_programa", "description": "Secretaria de Programa de Estudios"},
    {"name": "coordinador_programa", "description": "Coordinador de Programa de Estudios"},
    {"name": "oficina_admision", "description": "Oficina de Admisiones"},
    {"name": "docente", "description": "Docente"},
    {"name": "estudiante", "description": "Estudiante Regular"},
]


class RoleSeeder(BaseSeeder):
    """Seeder para roles del sistema.

    Idempotente: agrega los roles que falten sin tocar los existentes.
    """

    def get_dependencies(self) -> List[str]:
        return []

    async def should_run(self) -> bool:
        result = await self.db.execute(select(CoreRole))
        existing = {r.name for r in result.scalars().all()}
        return any(r["name"] not in existing for r in ROLES)

    async def run(self):
        result = await self.db.execute(select(CoreRole))
        existing = {r.name: r for r in result.scalars().all()}

        created = []
        for role_data in ROLES:
            if role_data["name"] not in existing:
                role = CoreRole(**role_data)
                self.db.add(role)
                created.append(role)

        if created:
            await self.db.commit()
            for role in created:
                await self.db.refresh(role)
            self.log_success(f"Creados {len(created)} roles: {[r.name for r in created]}")
        else:
            self.log_warning("Todos los roles ya existen, nada que crear")

        return created
