from datetime import timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from .repositories.user_repository import UserRepository
from .tokens import token_service
from .permissions import permission_service
from ..gateway.event_bus import event_bus, EventFactory
from ..gateway.event_schemas import EventType
import bcrypt

class AuthService:
    """Servicio de autenticación y autorización"""
    
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)
    
    async def register_user(self, email: str, password: str, full_name: str = None) -> Dict[str, Any]:
        """Registra un nuevo usuario"""
        # Verificar si el usuario ya existe
        existing_user = await self.user_repo.get_by_email(email)
        if existing_user:
            return {"success": False, "error": "El usuario ya existe"}
        
        # Hash password
        hashed_password = self._hash_password(password)
        
        # Crear usuario
        user = await self.user_repo.create_user(email, hashed_password, full_name)
        
        # Publicar evento
        if event_bus.connected:
            event = EventFactory.user_created({
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name
            })
            await event_bus.publish(event)
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name
            }
        }
    
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Autentica usuario y retorna token"""
        user = await self.user_repo.get_user_with_roles_by_email(email)
        if not user or not user.is_active:
            return None
        
        if not self._verify_password(password, user.hashed_password):
            return None
        
        # Obtener permisos del usuario
        permissions = await self.user_repo.get_user_permissions(user.id)
        
        # Obtener rol primario
        primary_role = user.roles[0].name if user.roles else "estudiante"
        
        # Generar token
        access_token = token_service.create_user_token(
            user_id=str(user.id),
            email=user.email,
            permissions=permissions,
            role=primary_role
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": primary_role,
                "permissions": permissions
            }
        }
    
    def _hash_password(self, password: str) -> str:
        """Genera hash de password"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifica password"""
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    async def get_current_user(self, token: str) -> Optional[Dict[str, Any]]:
        """Obtiene usuario actual desde token"""
        payload = token_service.verify_token(token)
        if not payload or payload.get("type") != "user_access":
            return None
        
        user_id = payload.get("sub")
        user = await self.user_repo.get_by_id_with_roles(int(user_id))
        
        if not user or not user.is_active:
            return None
        
        permissions = await self.user_repo.get_user_permissions(user.id)
        
        primary_role = user.roles[0].name if user.roles else "estudiante"
        
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": primary_role,
            "permissions": permissions,
            "is_superuser": user.is_superuser
        }