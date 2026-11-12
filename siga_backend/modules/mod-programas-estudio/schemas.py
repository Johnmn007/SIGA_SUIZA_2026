"""
Esquemas Pydantic para el módulo mod-programas-estudio (SIGA Suiza 2026).
"""
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, List
from datetime import datetime, date


# ==============================================================================
# SCHEMAS: SÍLABOS
# ==============================================================================

class SilaboBase(BaseModel):
    carga_lectiva_id: int
    estado: Optional[str] = "borrador" # borrador, presentado, aprobado, observado
    archivo_url: Optional[str] = None
    observaciones: Optional[str] = None

class SilaboCreate(SilaboBase):
    pass

class SilaboUpdate(BaseModel):
    """Payload para actualización general de un sílabo (PUT /silabos/{silabo_id})"""
    archivo_url: Optional[str] = Field(None, description="URL del archivo PDF o documento del sílabo")
    estado: Optional[str] = Field(None, description="Estado del sílabo: borrador, presentado, aprobado, observado")
    observaciones: Optional[str] = Field(None, description="Observaciones o retroalimentación del coordinador")

    model_config = ConfigDict(from_attributes=True)

class SilaboResponse(SilaboBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# SCHEMAS: PLANES DE TRABAJO DOCENTE
# ==============================================================================

class PlanTrabajoDocenteBase(BaseModel):
    periodo_id: int
    programa_id: int
    docente_id: int
    estado: Optional[str] = "borrador" # borrador, presentado, aprobado, observado
    archivo_url: Optional[str] = None
    observaciones: Optional[str] = None

class PlanTrabajoDocenteCreate(PlanTrabajoDocenteBase):
    pass

class PlanTrabajoDocenteUpdate(BaseModel):
    """Payload para actualización general de un plan (PUT /planes-trabajo/{plan_id})"""
    archivo_url: Optional[str] = Field(None, description="URL del plan de trabajo docente")
    estado: Optional[str] = Field(None, description="Estado del plan: borrador, presentado, aprobado, observado")
    observaciones: Optional[str] = Field(None, description="Observaciones del coordinador de programa")

    model_config = ConfigDict(from_attributes=True)

class PlanTrabajoDocenteResponse(PlanTrabajoDocenteBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# SCHEMAS: CARGA LECTIVA
# ==============================================================================

class CargaLectivaBase(BaseModel):
    periodo_id: int
    docente_id: int
    unidad_didactica_id: int
    turno: Optional[str] = None
    seccion: Optional[str] = None
    estado: str = "borrador"

class CargaLectivaCreate(CargaLectivaBase):
    pass

class CargaLectivaUpdate(BaseModel):
    """Esquema para actualización parcial de asignación de carga lectiva."""
    docente_id: Optional[int] = None
    turno: Optional[str] = None
    seccion: Optional[str] = None
    estado: Optional[str] = None
    fecha_limite_notas: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)

class CargaLectivaResponse(CargaLectivaBase):
    id: int
    programa_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    fecha_limite_notas: Optional[date] = None
    acta_cerrada: bool = False
    acta_cerrada_at: Optional[datetime] = None
    acta_cerrada_por: Optional[int] = None
    unidad_nombre: Optional[str] = None
    programa_nombre: Optional[str] = None
    modulo_nombre: Optional[str] = None
    ciclo: Optional[int] = None
    creditos: Optional[int] = None
    horas: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# SCHEMAS: HORARIOS DE PERIODO
# ==============================================================================

class HorarioPeriodoBase(BaseModel):
    periodo_id: int
    estado: str = "borrador"
    archivo_excel_url: str
    observaciones: Optional[str] = None

class HorarioPeriodoCreate(HorarioPeriodoBase):
    pass

class HorarioPeriodoUpdate(BaseModel):
    """Esquema para actualización de horario de periodo."""
    archivo_excel_url: Optional[str] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class HorarioPeriodoResponse(HorarioPeriodoBase):
    id: int
    programa_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# SCHEMAS: PROGRAMA DE ESTUDIO Y PERIODO
# ==============================================================================

class ProgramaBase(BaseModel):
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    duracion_periodos: int = 6
    creditos_totales: int
    plan_estudio_id: Optional[int] = None
    modalidad: str = "presencial"
    estado: str = "activo"

class ProgramaCreate(ProgramaBase):
    pass

class ProgramaResponse(ProgramaBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PeriodoBase(BaseModel):
    codigo: str
    fecha_inicio: datetime
    fecha_fin: datetime
    estado: str = "planificacion"
    fecha_fin_matricula_regular: Optional[datetime] = None
    fecha_fin_matricula_extemporanea: Optional[datetime] = None

class PeriodoCreate(PeriodoBase):
    pass

class PeriodoResponse(PeriodoBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    nombre: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_nombre(self):
        if not self.nombre:
            self.nombre = self.codigo
        return self


# ==============================================================================
# SCHEMAS: TUTORÍAS
# ==============================================================================

class TutoriaBase(BaseModel):
    periodo_id: int
    docente_id: int
    ciclo: int
    observaciones: Optional[str] = None

class TutoriaCreate(TutoriaBase):
    pass

class TutoriaResponse(TutoriaBase):
    id: int
    programa_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
