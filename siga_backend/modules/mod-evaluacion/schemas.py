from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

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
    estado: str
    model_config = ConfigDict(from_attributes=True)
