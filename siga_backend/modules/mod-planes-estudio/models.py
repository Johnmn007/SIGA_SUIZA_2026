from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, JSON, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import BaseModel

class PlanEstudio(BaseModel):
    """Modelo para planes de estudio base (MINEDU)"""
    __tablename__ = "planes_estudio"

    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text)
    nivel_formativo = Column(String(100))
    creditos_totales = Column(Integer)
    horas_totales = Column(Integer)
    fecha_aprobacion = Column(Date)
    resolucion_aprobacion = Column(String(100))
    estado = Column(String(20), default="activo")

    # Relaciones
    modulos = relationship("ModuloPlan", back_populates="plan", cascade="all, delete-orphan")

class ModuloPlan(BaseModel):
    """Módulos formativos del plan"""
    __tablename__ = "modulos_plan"

    plan_id = Column(Integer, ForeignKey("planes_estudio.id"), nullable=False)
    codigo = Column(String(50))
    nombre = Column(String(255), nullable=False)
    horas = Column(Integer)
    creditos = Column(Integer)
    orden = Column(Integer)
    
    plan = relationship("PlanEstudio", back_populates="modulos")
    unidades = relationship("UnidadPlan", back_populates="modulo", cascade="all, delete-orphan")

class UnidadPlan(BaseModel):
    """Unidades didácticas del módulo"""
    __tablename__ = "unidades_plan"

    modulo_id = Column(Integer, ForeignKey("modulos_plan.id"), nullable=False)
    codigo = Column(String(50))
    nombre = Column(String(255), nullable=False)
    horas = Column(Integer)
    creditos = Column(Integer)
    tipo = Column(String(50)) # Teoría/Práctica
    orden = Column(Integer)
    
    modulo = relationship("ModuloPlan", back_populates="unidades")
