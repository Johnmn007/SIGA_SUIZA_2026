from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Dict, List, Set

from .base_seeder import BaseSeeder
from ..models import CoreRole, CorePermission

MODULES = {
    "mod-usuarios": ["read", "write", "admin"],
    "mod-programas-estudio": ["read", "write", "admin"],
    "mod-planes-estudio": ["read", "write", "admin"],
    "mod-gestion-academica": ["read", "write", "admin"],
    "mod-evaluacion": ["read", "write", "admin"],
    "mod-admision": ["read", "write", "admin"],
    "mod-auditoria": ["read", "admin"],
}

ALL_READ = [f"{module}:read" for module in MODULES]

ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "superadmin": [f"{module}:{action}" for module, actions in MODULES.items() for action in actions],
    "director": [*ALL_READ, "mod-auditoria:admin"],
    "caja_tesoreria": [*ALL_READ, "mod-gestion-academica:write"],
    "secretaria_academica": [
        *ALL_READ,
        "mod-gestion-academica:write",
        "mod-evaluacion:write",
        "mod-usuarios:write",
    ],
    "secretaria_programa": [*ALL_READ, "mod-gestion-academica:write"],
    "coordinador_programa": [
        *ALL_READ,
        "mod-programas-estudio:write",
        "mod-evaluacion:write",
    ],
    "oficina_admision": [*ALL_READ, "mod-admision:write", "mod-admision:admin"],
    "docente": [
        "mod-programas-estudio:read",
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


class PermissionSeeder(BaseSeeder):
    """Crea los permisos por módulo y los asigna a cada rol.

    Es idempotente: se puede re-ejecutar para sincronizar roles o permisos
    nuevos sin duplicar filas ni perder las asignaciones existentes.
    """

    def get_dependencies(self) -> List[str]:
        return ["RoleSeeder"]

    async def run(self):
        permissions = await self._sync_permissions()
        await self._assign_to_roles(permissions)

    async def _sync_permissions(self) -> Dict[str, CorePermission]:
        result = await self.db.execute(select(CorePermission))
        by_name: Dict[str, CorePermission] = {p.name: p for p in result.scalars().all()}

        created = 0
        for module, actions in MODULES.items():
            for action in actions:
                name = f"{module}:{action}"
                if name in by_name:
                    continue
                permission = CorePermission(
                    name=name,
                    description=f"{action} sobre {module}",
                )
                self.db.add(permission)
                by_name[name] = permission
                created += 1

        await self.db.commit()
        self.log_success(f"Permisos: {len(by_name)} en catálogo ({created} nuevos)")
        return by_name

    async def _assign_to_roles(self, permissions: Dict[str, CorePermission]):
        # selectinload evita el lazy-load perezoso de role.permissions, que
        # falla con MissingGreenlet fuera del contexto await de SQLAlchemy.
        result = await self.db.execute(
            select(CoreRole).options(selectinload(CoreRole.permissions))
        )
        roles = {role.name: role for role in result.scalars().all()}

        assigned = 0
        for role_name, permission_names in ROLE_PERMISSIONS.items():
            role = roles.get(role_name)
            if role is None:
                self.log_warning(f"Rol '{role_name}' no existe, se omite su asignación")
                continue

            current: Set[str] = {p.name for p in role.permissions}
            missing = [n for n in permission_names if n not in current]
            if not missing:
                continue

            for name in missing:
                permission = permissions.get(name)
                if permission is None:
                    self.log_warning(f"Permiso '{name}' no encontrado, se omite")
                    continue
                role.permissions.append(permission)

            assigned += len(missing)
            self.log_success(f"  {role_name}: +{len(missing)} permisos")

        await self.db.commit()
        self.log_success(f"Asignación de permisos completada ({assigned} enlaces nuevos)")
