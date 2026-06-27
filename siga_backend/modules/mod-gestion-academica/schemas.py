from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import date, datetime

class EstudianteBase(BaseModel):
    codigo_estudiante: str
    dni: str
    nombres: str
    apellidos: str
    fecha_nacimiento: Optional[date] = None
    email_institucional: Optional[EmailStr] = None
    email_personal: Optional[EmailStr] = None
    celular: Optional[str] = None
    direccion_domicilio: Optional[str] = None

class EstudianteCreate(EstudianteBase):
    pass

class EstudianteUpdate(BaseModel):
    codigo_estudiante: Optional[str] = None
    dni: Optional[str] = None
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    email_institucional: Optional[EmailStr] = None
    email_personal: Optional[EmailStr] = None
    celular: Optional[str] = None
    direccion_domicilio: Optional[str] = None
    estado_academico: Optional[str] = None
    foto_url: Optional[str] = None
    observaciones: Optional[str] = None

class EstudianteResponse(EstudianteBase):
    id: int
    estado_academico: str
    foto_url: Optional[str] = None
    observaciones: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class MatriculaBase(BaseModel):
    estudiante_id: int
    programa_id: int
    periodo_id: int
    tipo_ingreso: str = "Ordinario"
    observaciones: str = ""

class MatriculaCreate(MatriculaBase):
    pass

class MatriculaResponse(MatriculaBase):
    id: int
    estado_matricula: str
    model_config = ConfigDict(from_attributes=True)
