from typing import List, Dict
from enum import Enum

class PermissionScope(Enum):
    """Scopes de permisos centralizados del Core"""
    
    # Core permissions
    CORE_ACCESS = "core:access"
    MODULE_MANAGE = "core:module:manage"
    USER_MANAGE = "core:user:manage"
    
    # Module permission patterns
    MODULE_READ = "{module}:read"
    MODULE_WRITE = "{module}:write" 
    MODULE_ADMIN = "{module}:admin"

class PermissionService:
    """Servicio centralizado de permisos"""
    
    def __init__(self):
        self._permission_cache: Dict[str, List[str]] = {}
    
    def generate_module_permissions(self, module_name: str) -> List[str]:
        """Genera permisos estándar para un módulo"""
        return [
            PermissionScope.MODULE_READ.value.format(module=module_name),
            PermissionScope.MODULE_WRITE.value.format(module=module_name),
            PermissionScope.MODULE_ADMIN.value.format(module=module_name),
        ]
    
    def validate_user_permission(self, user_permissions: List[str], required: str) -> bool:
        """Valida si usuario tiene permiso requerido"""
        return required in user_permissions
    
    def get_user_permissions(self, user_id: str) -> List[str]:
        """Obtiene permisos de usuario (placeholder)"""
        # TODO: Integrar con base de datos
        return [PermissionScope.CORE_ACCESS.value]

# Instancia global  
permission_service = PermissionService()