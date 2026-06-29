from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from ..models import CoreUser, CoreRole

class UserRepository:
    """Repositorio para operaciones de usuarios"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_email(self, email: str) -> Optional[CoreUser]:
        """Obtiene usuario por email"""
        result = await self.db.execute(
            select(CoreUser).filter(CoreUser.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_by_id(self, user_id: int) -> Optional[CoreUser]:
        """Obtiene usuario por ID"""
        result = await self.db.execute(
            select(CoreUser).filter(CoreUser.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_id_with_roles(self, user_id: int) -> Optional[CoreUser]:
        """Obtiene usuario por ID con roles cargados (EAGER LOADING)"""
        result = await self.db.execute(
            select(CoreUser)
            .options(selectinload(CoreUser.roles))  # 👈 CARGAR ROLES EXPLÍCITAMENTE
            .filter(CoreUser.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_user_with_roles_by_email(self, email: str) -> Optional[CoreUser]:
        """Obtiene usuario por email con roles cargados (EAGER LOADING)"""
        result = await self.db.execute(
            select(CoreUser)
            .options(selectinload(CoreUser.roles))  # 👈 CARGAR ROLES EXPLÍCITAMENTE
            .filter(CoreUser.email == email)
        )
        return result.scalar_one_or_none()
    
    async def create_user(self, email: str, hashed_password: str, full_name: str = None) -> CoreUser:
        """Crea un nuevo usuario"""
        user = CoreUser(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def get_user_permissions(self, user_id: int) -> List[str]:
        """Obtiene permisos del usuario desde la base de datos"""
        result = await self.db.execute(
            select(CoreUser)
            .options(selectinload(CoreUser.roles).selectinload(CoreRole.permissions))
            .filter(CoreUser.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return []
        
        permissions = set(["core:access"])
        
        for role in user.roles:
            if role.name == "superadmin":
                permissions.update(["core:module:manage", "core:user:manage", "core:roles:manage"])
            for perm in role.permissions:
                permissions.add(perm.name)
        
        return list(permissions)