from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime, date

class RegistroEvaluacionBase(BaseModel):
    matricula_detalle_id: int
    estudiante_id: int
    unidad_didactica_id: int
    periodo_id: int
    nota_c1: Optional[int] = Field(None, ge=0, le=20)
    nota_c2: Optional[int] = Field(None, ge=0, le=20)
    nota_c3: Optional[int] = Field(None, ge=0, le=20)
    nota_final: Optional[int] = Field(None, ge=0, le=20)

class RegistroEvaluacionCreate(RegistroEvaluacionBase):
    pass

class RegistroEvaluacionUpdate(BaseModel):
    nota_c1: Optional[int] = Field(None, ge=0, le=20)
    nota_c2: Optional[int] = Field(None, ge=0, le=20)
    nota_c3: Optional[int] = Field(None, ge=0, le=20)
    nota_final: Optional[int] = Field(None, ge=0, le=20)

class RegistroEvaluacionResponse(RegistroEvaluacionBase):
    id: int
    nota_final: Optional[int] = None
    estado: Optional[str] = "cursando"
    model_config = ConfigDict(from_attributes=True)

# --- Schemas para Cierre de Actas y Fechas Límite ---

class EstadoActaUnidadResponse(BaseModel):
    tiene_carga: bool
    acta_cerrada: bool
    fecha_limite_notas: Optional[date] = None
    editable: bool
    motivo_bloqueo: Optional[str] = None

class CargaActaItem(BaseModel):
    carga_id: int
    unidad_didactica_id: int
    unidad: Optional[str] = None
    docente_id: int
    fecha_limite_notas: Optional[date] = None
    acta_cerrada: bool
    total_matriculas: int
    con_nota_final: int
    faltantes: int

class UnidadSinCargaItem(BaseModel):
    unidad_didactica_id: int
    unidad: Optional[str] = None
    total_matriculas: int
    con_nota_final: int
    faltantes: int

class ResumenActasProgramaResponse(BaseModel):
    cargas: List[CargaActaItem]
    unidades_sin_carga: List[UnidadSinCargaItem]

class FechaLimiteRequest(BaseModel):
    fecha_limite_notas: date

class ReabrirActaRequest(BaseModel):
    motivo: str
    nueva_fecha_limite: date
