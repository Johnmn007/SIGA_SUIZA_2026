from sqlalchemy import Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import BaseModel, Base

# Tabla de asociación
user_roles = Table(
    'core_user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('core_users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('core_roles.id'), primary_key=True),
    extend_existing=True
)

class Usuario(Base):
    """Mapeo a core_users para gestión administrativa"""
    __tablename__ = "core_users"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    roles = relationship("Rol", secondary=user_roles, back_populates="usuarios")

class Rol(Base):
    """Mapeo a core_roles"""
    __tablename__ = "core_roles"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    usuarios = relationship("Usuario", secondary=user_roles, back_populates="roles")

class Permiso(Base):
    """Mapeo a core_permissions"""
    __tablename__ = "core_permissions"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())