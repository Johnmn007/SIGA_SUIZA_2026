from datetime import datetime, timedelta
from typing import Dict, List, Optional
from jose import JWTError, jwt
from app.core.config import settings

class TokenService:
    """Servicio centralizado de tokens JWT"""
    
    def __init__(self):
        self.secret_key = settings.secret_key
        self.algorithm = "HS256"
    
    def create_user_token(self, user_id: str, email: str, permissions: List[str]) -> str:
        """Crea JWT para usuarios del sistema"""
        payload = {
            "sub": user_id,
            "email": email,
            "permissions": permissions,
            "type": "user_access",
            "exp": datetime.utcnow() + timedelta(minutes=settings.token_expire_minutes)
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_module_token(self, module_name: str, scopes: List[str]) -> str:
        """Crea token para comunicación entre módulos"""
        payload = {
            "sub": f"module::{module_name}",
            "scopes": scopes,
            "type": "module_access", 
            "exp": datetime.utcnow() + timedelta(hours=settings.module_token_expire_hours)
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verifica cualquier token del sistema"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None
    
    def get_token_type(self, token: str) -> Optional[str]:
        """Obtiene el tipo de token"""
        payload = self.verify_token(token)
        return payload.get("type") if payload else None

# Instancia global
token_service = TokenService()