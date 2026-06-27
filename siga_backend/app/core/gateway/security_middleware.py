from fastapi import Request, HTTPException, Header
from typing import Optional, Dict, Any
import logging

from ..identity.auth_service import AuthService
from ..identity.tokens import token_service

logger = logging.getLogger(__name__)

class SecurityMiddleware:
    """Middleware de seguridad para el Gateway HTTP"""
    
    def __init__(self, auth_service: AuthService):
        self.auth_service = auth_service
    
    async def authenticate_request(self, request: Request, authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
        """Autentica request y retorna usuario si es válido"""
        
        # Normalizar path (quitar / al final)
        path = request.url.path.rstrip("/")
        if not path: path = "/"
        
        # Rutas públicas que no requieren autenticación
        public_paths = {
            "/", "/health", "/core/status", "/core/modules",
            "/docs", "/redoc", "/openapi.json"
        }
        
        if path in public_paths:
            return None
        
        # Verificar header de autorización
        if not authorization:
            raise HTTPException(status_code=401, detail="Token de autorización requerido")
        
        try:
            # Extraer token del header "Bearer <token>"
            scheme, token = authorization.split()
            if scheme.lower() != "bearer":
                raise HTTPException(status_code=401, detail="Esquema de autenticación inválido")
            
            # Verificar y obtener usuario
            user = await self.auth_service.get_current_user(token)
            if not user:
                raise HTTPException(status_code=401, detail="Token inválido o expirado")
            
            # Verificar permisos para rutas de módulos
            if request.url.path.startswith("/api/"):
                module_name = request.url.path.split("/")[2]  # /api/{module_name}/...
                has_perm = any(p.startswith(f"{module_name}:") for p in user["permissions"])
                
                if not has_perm:
                    raise HTTPException(status_code=403, detail="Permisos insuficientes para este módulo")
            
            logger.info(f"🔐 Usuario autenticado: {user['email']} - {request.method} {request.url.path}")
            return user
            
        except ValueError:
            raise HTTPException(status_code=401, detail="Formato de autorización inválido")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error en autenticación: {e}")
            raise HTTPException(status_code=500, detail="Error de autenticación")

# Instancia global (se inicializará en main.py)
security_middleware: Optional[SecurityMiddleware] = None