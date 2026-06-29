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

class PerfilPersonal(Base):
    """Perfil extendido para personal institucional y docentes"""
    __tablename__ = "perfiles_personal"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("core_users.id", ondelete="CASCADE"), unique=True, nullable=False)
    condicion_laboral = Column(String(50), nullable=False) # NOMBRADO_ESTADO, CONTRATADO_DRE, CONTRATADO_INSTITUCIONAL
    numero_resolucion = Column(String(100), nullable=True)
    fecha_fin_contrato = Column(DateTime, nullable=True)
    cargo_funcional = Column(String(50), nullable=False) # DOCENTE_AULA, ASISTENTE_LABORATORIO, JEFE_AREA, SECRETARIA_PROGRAMA
    profesion_titulo = Column(String(200), nullable=True)
    programa_estudio_id = Column(Integer, nullable=True) # Referencia lógica cruzada (no FK dura)
    
    usuario = relationship("Usuario", backref="perfil_personal")