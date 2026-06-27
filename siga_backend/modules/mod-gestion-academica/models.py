from sqlalchemy import Column, String, Integer, Date, Boolean, Text, Float, ForeignKey, TIMESTAMP, func
from database import BaseModel

class Estudiante(BaseModel):
    __tablename__ = "estudiantes"

    codigo_estudiante = Column(String(20), unique=True, index=True, nullable=False)
    dni = Column(String(15), unique=True, index=True, nullable=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date)
    email_institucional = Column(String(150), unique=True)
    email_personal = Column(String(150))
    celular = Column(String(20))
    direccion_domicilio = Column(String(255))
    estado_academico = Column(String(30), default="postulante")
    foto_url = Column(String(255))
    observaciones = Column(Text)

class Matricula(BaseModel):
    __tablename__ = "matriculas"

    estudiante_id = Column(Integer, ForeignKey("estudiantes.id"), index=True, nullable=False)
    programa_id = Column(Integer, index=True, nullable=False)
    periodo_id = Column(Integer, index=True, nullable=False)
    tipo_ingreso = Column(String(50))
    estado_matricula = Column(String(30), default="pendiente")
    observaciones = Column(String(255))
