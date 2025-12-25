from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class ProgramaEstudio(Base):
    """Modelo para programas de estudio (carreras)"""
    __tablename__ = "programas_estudio"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    descripcion = Column(Text)
    duracion_periodos = Column(Integer, default=6)
    creditos_totales = Column(Integer, nullable=False)
    plan_estudio_id = Column(Integer)
    modalidad = Column(String(50), default="presencial")
    estado = Column(String(20), default="activo")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relaciones
    configuraciones = relationship("ProgramaConfiguracion", back_populates="programa")
    modulos = relationship("ProgramaModulo", back_populates="programa")
    requisitos = relationship("ProgramaRequisito", back_populates="programa")

class ProgramaConfiguracion(Base):
    """Configuración por periodo académico"""
    __tablename__ = "programa_configuraciones"

    id = Column(Integer, primary_key=True, index=True)
    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    periodo_academico = Column(Integer, nullable=False)
    turnos = Column(JSON)  # {mañana: bool, tarde: bool, noche: bool}
    coordinador_id = Column(Integer)
    max_estudiantes = Column(Integer, default=30)
    created_at = Column(TIMESTAMP, server_default=func.now())

    programa = relationship("ProgramaEstudio", back_populates="configuraciones")

class ProgramaModulo(Base):
    """Módulos del programa"""
    __tablename__ = "programa_modulos"

    id = Column(Integer, primary_key=True, index=True)
    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    modulo_plan_id = Column(Integer)
    nombre = Column(String(255), nullable=False)
    periodo = Column(Integer, nullable=False)
    horas_totales = Column(Integer)
    creditos = Column(Integer)
    orden = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())

    programa = relationship("ProgramaEstudio", back_populates="modulos")
    unidades = relationship("ProgramaUnidad", back_populates="modulo")

class ProgramaUnidad(Base):
    """Unidades de cada módulo"""
    __tablename__ = "programa_unidades"

    id = Column(Integer, primary_key=True, index=True)
    programa_modulo_id = Column(Integer, ForeignKey("programa_modulos.id"), nullable=False)
    unidad_plan_id = Column(Integer)
    nombre = Column(String(255), nullable=False)
    horas_teoria = Column(Integer, default=0)
    horas_practica = Column(Integer, default=0)
    creditos = Column(Integer)
    orden = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())

    modulo = relationship("ProgramaModulo", back_populates="unidades")

class ProgramaRequisito(Base):
    """Requisitos de titulación"""
    __tablename__ = "programa_requisitos"

    id = Column(Integer, primary_key=True, index=True)
    programa_id = Column(Integer, ForeignKey("programas_estudio.id"), nullable=False)
    tipo_requisito = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=False)
    obligatorio = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    programa = relationship("ProgramaEstudio", back_populates="requisitos")