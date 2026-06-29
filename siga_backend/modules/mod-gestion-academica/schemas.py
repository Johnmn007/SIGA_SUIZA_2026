from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class EstudianteBase(BaseModel):
    codigo_estudiante: str
    dni: str
    nombres: str
    apellidos: str
    fecha_nacimiento: Optional[date] = None
    programa_id: Optional[int] = None
    email_institucional: Optional[EmailStr] = None
    email_personal: Optional[EmailStr] = None
    celular: Optional[str] = None
    direccion_domicilio: Optional[str] = None
    pago_matricula: Optional[bool] = False
    documentos_completos: Optional[bool] = True
    fecha_limite_documentos: Optional[datetime] = None

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
    pago_matricula: Optional[bool] = None
    documentos_completos: Optional[bool] = None
    fecha_limite_documentos: Optional[datetime] = None

class EstudianteResponse(EstudianteBase):
    id: int
    estado_academico: str
    foto_url: Optional[str] = None
    observaciones: Optional[str] = None
    pago_matricula: bool
    documentos_completos: bool
    fecha_limite_documentos: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class MatriculaDetalleBase(BaseModel):
    unidad_didactica_id: int
    creditos: int

class MatriculaDetalleCreate(MatriculaDetalleBase):
    pass

class MatriculaDetalleResponse(MatriculaDetalleBase):
    id: int
    estado_curso: str
    model_config = ConfigDict(from_attributes=True)

class MatriculaBase(BaseModel):
    estudiante_id: int
    programa_id: int
    periodo_id: int
    tipo_ingreso: str = "Ordinario"
    observaciones: str = ""

class MatriculaCreate(MatriculaBase):
    detalles: List[MatriculaDetalleCreate]

class MatriculaResponse(MatriculaBase):
    id: int
    estado_matricula: str
    detalles: List[MatriculaDetalleResponse] = []
    model_config = ConfigDict(from_attributes=True)

class IngestaAdmitido(BaseModel):
    dni: str
    nombres: str
    apellidos: str
    puntaje: float
    puesto: int
    programa_id: int
    periodo_id: int
    celular: Optional[str] = None
    email_personal: Optional[EmailStr] = None

class IngestaMasivaRequest(BaseModel):
    proceso_admision_id: str
    admitidos: List[IngestaAdmitido]

# ================================
# FASE 4: CASUISTICAS Y TRAMITES
# ================================

class HistorialAcademicoCreate(BaseModel):
    estudiante_id: int
    periodo_id: int
    estado: str
    resolucion: Optional[str] = None
    observaciones: Optional[str] = None

class HistorialAcademicoResponse(HistorialAcademicoCreate):
    id: int
    fecha_registro: date
    model_config = ConfigDict(from_attributes=True)

class BeneficioEstudianteCreate(BaseModel):
    estudiante_id: int
    tipo_beneficio: str
    porcentaje_descuento: float
    condicion_mantenimiento: Optional[str] = None
    periodo_validez_inicio_id: int
    periodo_validez_fin_id: Optional[int] = None
    activo: bool = True

class BeneficioEstudianteResponse(BeneficioEstudianteCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SolicitudTramiteCreate(BaseModel):
    estudiante_id: int
    tipo_tramite: str
    observaciones: Optional[str] = None

class SolicitudTramiteResponse(SolicitudTramiteCreate):
    id: int
    estado: str
    fecha_solicitud: date
    fecha_resolucion: Optional[date] = None
    documento_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ConvalidacionDetalleCreate(BaseModel):
    unidad_destino_id: int
    curso_origen: str
    nota_reconocida: Optional[float] = None
    creditos_reconocidos: Optional[int] = None

class ConvalidacionDetalleResponse(ConvalidacionDetalleCreate):
    id: int
    resolucion_id: int
    model_config = ConfigDict(from_attributes=True)

class ResolucionConvalidacionCreate(BaseModel):
    estudiante_id: int
    numero_resolucion: str
    fecha_emision: date
    tipo_convalidacion: str
    institucion_origen: Optional[str] = None
    detalles: List[ConvalidacionDetalleCreate]

class ResolucionConvalidacionResponse(BaseModel):
    id: int
    estudiante_id: int
    numero_resolucion: str
    fecha_emision: date
    tipo_convalidacion: str
    institucion_origen: Optional[str] = None
    estado: str
    detalles: List[ConvalidacionDetalleResponse] = []
    model_config = ConfigDict(from_attributes=True)

