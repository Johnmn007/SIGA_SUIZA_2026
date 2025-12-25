from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from database_sync import get_db
from models import ProgramaEstudio, ProgramaConfiguracion, ProgramaModulo, ProgramaUnidad, ProgramaRequisito

router = APIRouter()

# Schemas Pydantic
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
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

# Health Check (CRÍTICO para descubrimiento)
@router.get("/health")
async def health_check():
    return {"status": "healthy", "module": "mod-programas-estudio"}

# Endpoints CRUD
@router.post("/programas", response_model=ProgramaResponse, status_code=status.HTTP_201_CREATED)
async def crear_programa(programa: ProgramaCreate, db: Session = Depends(get_db)):
    """Crear nuevo programa de estudio"""
    # Verificar si el código ya existe
    result = db.execute(
        select(ProgramaEstudio).where(ProgramaEstudio.codigo == programa.codigo)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Ya existe un programa con este código"
        )
    
    # Crear nuevo programa
    db_programa = ProgramaEstudio(**programa.dict())
    db.add(db_programa)
    db.commit()
    db.refresh(db_programa)
    
    return db_programa

@router.get("/programas", response_model=List[ProgramaResponse])
async def obtener_programas(db: Session = Depends(get_db)):
    """Obtener todos los programas"""
    result = db.execute(
        select(ProgramaEstudio).order_by(ProgramaEstudio.nombre)
    )
    programas = result.scalars().all()
    return programas

@router.get("/programas/{programa_id}", response_model=ProgramaResponse)
async def obtener_programa(programa_id: int, db: Session = Depends(get_db)):
    """Obtener programa por ID"""
    result = db.execute(
        select(ProgramaEstudio).where(ProgramaEstudio.id == programa_id)
    )
    programa = result.scalar_one_or_none()
    
    if not programa:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    
    return programa

@router.get("/programas/{programa_id}/estructura-completa")
async def obtener_estructura_completa(programa_id: int, db: Session = Depends(get_db)):
    """Obtener estructura completa del programa con módulos y unidades"""
    # Obtener programa base
    result = db.execute(
        select(ProgramaEstudio).where(ProgramaEstudio.id == programa_id)
    )
    programa = result.scalar_one_or_none()
    
    if not programa:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    
    # Obtener configuraciones
    result_config = db.execute(
        select(ProgramaConfiguracion)
        .where(ProgramaConfiguracion.programa_id == programa_id)
        .order_by(ProgramaConfiguracion.periodo_academico)
    )
    configuraciones = result_config.scalars().all()
    
    # Obtener módulos
    result_modulos = db.execute(
        select(ProgramaModulo)
        .where(ProgramaModulo.programa_id == programa_id)
        .order_by(ProgramaModulo.periodo, ProgramaModulo.orden)
    )
    modulos = result_modulos.scalars().all()
    
    # Obtener unidades para cada módulo
    modulos_con_unidades = []
    for modulo in modulos:
        result_unidades = db.execute(
            select(ProgramaUnidad)
            .where(ProgramaUnidad.programa_modulo_id == modulo.id)
            .order_by(ProgramaUnidad.orden)
        )
        unidades = result_unidades.scalars().all()
        modulos_con_unidades.append({
            **modulo.__dict__,
            "unidades": unidades
        })
    
    # Obtener requisitos
    result_requisitos = db.execute(
        select(ProgramaRequisito)
        .where(ProgramaRequisito.programa_id == programa_id)
    )
    requisitos = result_requisitos.scalars().all()
    
    return {
        **programa.__dict__,
        "configuraciones": configuraciones,
        "modulos": modulos_con_unidades,
        "requisitos": requisitos
    }

@router.put("/programas/{programa_id}", response_model=ProgramaResponse)
async def actualizar_programa(programa_id: int, programa_data: ProgramaCreate, db: Session = Depends(get_db)):
    """Actualizar programa existente"""
    result = db.execute(
        select(ProgramaEstudio).where(ProgramaEstudio.id == programa_id)
    )
    programa = result.scalar_one_or_none()
    
    if not programa:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    
    # Actualizar campos
    for field, value in programa_data.dict().items():
        setattr(programa, field, value)
    
    db.commit()
    db.refresh(programa)
    
    return programa

@router.delete("/programas/{programa_id}")
async def eliminar_programa(programa_id: int, db: Session = Depends(get_db)):
    """Eliminar programa (soft delete)"""
    result = db.execute(
        select(ProgramaEstudio).where(ProgramaEstudio.id == programa_id)
    )
    programa = result.scalar_one_or_none()
    
    if not programa:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    
    # Soft delete
    programa.estado = "inactivo"
    db.commit()
    
    return {"message": "Programa eliminado correctamente"}