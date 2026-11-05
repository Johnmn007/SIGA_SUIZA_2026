from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import insert
from typing import List, Dict
import logging

from .base_seeder import BaseSeeder
from ..models import CoreRole, CorePermission, role_permissions

logger = logging.getLogger(__name__)

class PermissionSeeder(BaseSeeder):
    """Seeder de permisos por rol del sistema"""

    MODULES = [
        "mod-planes-estudio",
        "mod-programas-estudio",
        "mod-usuarios",
        "mod-gestion-academica",
        "mod-evaluacion",
        "mod-admision",
        "mod-auditoria",
    ]

    # Rol -> lista de permisos ({module}:read / {module}:write)
    ROLE_PERMISSIONS: Dict[str, List[str]] = {
        "superadmin": [
            f"{m}:read" for m in MODULES
        ] + [
            f"{m}:write" for m in MODULES
        ],
        "caja_tesoreria": [
            "mod-programas-estudio:read",
            "mod-gestion-academica:read",
            "mod-gestion-academica:write",
            "mod-evaluacion:read",
        ],
        "secretaria_academica": [
            "mod-planes-estudio:read",
            "mod-planes-estudio:write",
            "mod-programas-estudio:read",
            "mod-programas-estudio:write",
            "mod-usuarios:read",
            "mod-usuarios:write",
            "mod-gestion-academica:read",
            "mod-gestion-academica:write",
            "mod-evaluacion:read",
            "mod-admision:read",
        ],
        "secretaria_programa": [
            "mod-programas-estudio:read",
            "mod-gestion-academica:read",
            "mod-gestion-academica:write",
            "mod-evaluacion:read",
        ],
        "coordinador_programa": [
            "mod-planes-estudio:read",
            "mod-planes-estudio:write",
            "mod-programas-estudio:read",
            "mod-programas-estudio:write",
            "mod-usuarios:read",
            "mod-gestion-academica:read",
            "mod-gestion-academica:write",
            "mod-evaluacion:read",
            "mod-evaluacion:write",
        ],
        "admin_admision": [
            "mod-programas-estudio:read",
            "mod-gestion-academica:read",
            "mod-gestion-academica:write",
            "mod-evaluacion:read",
            "mod-usuarios:read",
            "mod-admision:read",
            "mod-admision:write",
        ],
        "docente": [
            "mod-planes-estudio:read",
            "mod-programas-estudio:read",
            "mod-programas-estudio:write",
            "mod-gestion-academica:read",
            "mod-evaluacion:read",
            "mod-evaluacion:write",
        ],
        "estudiante": [
            "mod-programas-estudio:read",
            "mod-gestion-academica:read",
            "mod-evaluacion:read",
        ],
    }

    def get_dependencies(self) -> List[str]:
        return ["RoleSeeder"]

    async def should_run(self) -> bool:
        result = await self.db.execute(select(CorePermission))
        existing = {p.name for p in result.scalars().all()}
        all_permission_names = {
            perm
            for perms in self.ROLE_PERMISSIONS.values()
            for perm in perms
        }
        return not all_permission_names.issubset(existing)

    async def run(self) -> List[CorePermission]:
        # Obtener roles existentes
        result = await self.db.execute(select(CoreRole))
        roles = {role.name: role for role in result.scalars().all()}

        # Crear o recuperar todos los permisos (único por nombre)
        all_permission_names = {
            perm
            for perms in self.ROLE_PERMISSIONS.values()
            for perm in perms
        }

        description_map = {
            ":read": "Lectura",
            ":write": "Escritura",
        }

        res_p = await self.db.execute(select(CorePermission))
        permissions: Dict[str, CorePermission] = {p.name: p for p in res_p.scalars().all()}

        new_count = 0
        for perm_name in sorted(all_permission_names):
            if perm_name not in permissions:
                modulo = perm_name.rsplit(":", 1)[0]
                accion = perm_name.rsplit(":", 1)[1]
                perm = CorePermission(
                    name=perm_name,
                    description=f"{description_map.get(':' + accion, 'Acceso')} - {modulo}"
                )
                permissions[perm_name] = perm
                self.db.add(perm)
                new_count += 1

        if new_count > 0:
            await self.db.flush()  # Obtener IDs de nuevos permisos

        # Obtener asociaciones existentes en role_permissions
        res_rp = await self.db.execute(select(role_permissions))
        existing_assoc = {(row.role_id, row.permission_id) for row in res_rp.fetchall()}

        # Asignar permisos faltantes a cada rol usando la tabla de asociación
        associations = []
        for role_name, perm_names in self.ROLE_PERMISSIONS.items():
            role = roles.get(role_name)
            if not role:
                self.log_warning(f"Rol '{role_name}' no encontrado, saltando asignación")
                continue
            for perm_name in perm_names:
                perm_obj = permissions.get(perm_name)
                if perm_obj and (role.id, perm_obj.id) not in existing_assoc:
                    associations.append({
                        "role_id": role.id,
                        "permission_id": perm_obj.id
                    })
                    existing_assoc.add((role.id, perm_obj.id))

        if associations:
            await self.db.execute(insert(role_permissions), associations)

        await self.db.commit()

        self.log_success(f"Permisos sincronizados: {new_count} nuevos creados, {len(associations)} nuevas asociaciones asignadas.")
        return list(permissions.values())