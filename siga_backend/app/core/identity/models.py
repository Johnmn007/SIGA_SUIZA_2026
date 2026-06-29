from sqlalchemy import Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

# Tabla de asociación para usuarios y roles
user_roles = Table(
    'core_user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('core_users.id', ondelete='CASCADE')),
    Column('role_id', Integer, ForeignKey('core_roles.id', ondelete='CASCADE'))
)

# Tabla de asociación para roles y permisos
role_permissions = Table(
    'core_role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('core_roles.id', ondelete='CASCADE')),
    Column('permission_id', Integer, ForeignKey('core_permissions.id', ondelete='CASCADE'))
)

class CoreUser(Base):
    """Usuarios centralizados del sistema"""
    __tablename__ = "core_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relación con roles
    roles = relationship("CoreRole", secondary=user_roles, back_populates="users")

class CoreRole(Base):
    """Roles del sistema"""
    __tablename__ = "core_roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con usuarios y permisos
    users = relationship("CoreUser", secondary=user_roles, back_populates="roles")
    permissions = relationship("CorePermission", secondary=role_permissions, back_populates="roles")

class CorePermission(Base):
    """Permisos centralizados"""
    __tablename__ = "core_permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con roles
    roles = relationship("CoreRole", secondary=role_permissions, back_populates="permissions")