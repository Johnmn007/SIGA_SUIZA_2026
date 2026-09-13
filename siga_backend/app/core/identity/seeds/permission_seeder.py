from typing import Dict, List

from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from .base_seeder import BaseSeeder
from ..models import CorePermission, CoreRole

# Permisos que comprueba el gateway en SecurityMiddleware.authenticate_request:
# para /api/{modulo}/... exige "{modulo}:read" en GET/OPTIONS/HEAD y
# "{modulo}:write" en el resto. Por eso el nombre del permiso tiene que
# coincidir exactamente con el nombre del modulo registrado.
MODULES = [
    "mod-usuarios",
    "mod-planes-estudio",
    "mod-programas-estudio",
    "mod-gestion-academica",
    "mod-evaluacion",
    "mod-auditoria",
    "mod-admision",
]

# Matriz rol -> permisos, derivada de las llamadas que hace realmente cada
# vista del frontend para el rol correspondiente (siga_frontend/src/modules).
# superadmin no aparece: is_superuser lo exime de la comprobacion.
ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "coordinador_programa": [
        "mod-programas-estudio:read", "mod-programas-estudio:write",
        "mod-planes-estudio:read",
        "mod-gestion-academica:read",
        "mod-evaluacion:read",
        "mod-usuarios:read",
    ],
    "docente": [
        "mod-evaluacion:read", "mod-evaluacion:write",
        "mod-programas-estudio:read",
        "mod-planes-estudio:read",
        "mod-gestion-academica:read",
    ],
    "estudiante": [
        "mod-evaluacion:read",
        "mod-programas-estudio:read",
        "mod-gestion-academica:read",
    ],
    "secretaria_academica": [
        "mod-gestion-academica:read", "mod-gestion-academica:write",
        "mod-programas-estudio:read", "mod-programas-estudio:write",
        "mod-planes-estudio:read", "mod-planes-estudio:write",
        "mod-usuarios:read",
    ],
    "secretaria_programa": [
        "mod-gestion-academica:read", "mod-gestion-academica:write",
        "mod-programas-estudio:read",
        "mod-planes-estudio:read",
    ],
    "caja_tesoreria": [
        "mod-gestion-academica:read", "mod-gestion-academica:write",
    ],
    "oficina_admision": [
        "mod-admision:read", "mod-admision:write",
        "mod-gestion-academica:read", "mod-gestion-academica:write",
    ],
}


class PermissionSeeder(BaseSeeder):
    """Crea los permisos por modulo y los asocia a cada rol.

    Es idempotente: se puede ejecutar sobre una base ya poblada y solo
    agrega lo que falte. Antes esta informacion solo existia en reset.sql,
    que habia que lanzar a mano, asi que una instalacion limpia dejaba a
    todos los usuarios no superadmin con 403 en cualquier ruta de modulo.
    """

    def get_dependencies(self) -> List[str]:
        return ["RoleSeeder"]

    async def should_run(self) -> bool:
        return True  # idempotente: siempre reconcilia

    async def run(self):
        # 1. Permisos {modulo}:{read,write,admin}
        result = await self.db.execute(select(CorePermission))
        existing = {p.name: p for p in result.scalars().all()}

        created = 0
        for module in MODULES:
            for action in ("read", "write", "admin"):
                name = f"{module}:{action}"
                if name not in existing:
                    perm = CorePermission(
                        name=name,
                        description=f"Permiso de {action} sobre {module}",
                    )
                    self.db.add(perm)
                    existing[name] = perm
                    created += 1

        if created:
            await self.db.commit()
            for perm in existing.values():
                if perm.id is None:
                    await self.db.refresh(perm)

        # 2. Asociaciones rol -> permiso
        result = await self.db.execute(
            select(CoreRole).options(selectinload(CoreRole.permissions))
        )
        roles = {r.name: r for r in result.scalars().all()}

        linked = 0
        for role_name, perm_names in ROLE_PERMISSIONS.items():
            role = roles.get(role_name)
            if not role:
                self.log_warning(f"Rol '{role_name}' no existe, se omiten sus permisos")
                continue

            current = {p.name for p in role.permissions}
            for perm_name in perm_names:
                perm = existing.get(perm_name)
                if perm and perm_name not in current:
                    role.permissions.append(perm)
                    linked += 1

        if linked:
            await self.db.commit()

        self.log_success(
            f"Permisos: {created} creados ({len(existing)} en total), "
            f"{linked} asociaciones nuevas rol-permiso"
        )
