from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from database import get_db, OutboxEvent
from models import ProgramaEstudio, ProgramaConfiguracion, ProgramaModulo, ProgramaUnidad, ProgramaRequisito, PeriodoAcademico

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
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Schemas Periodo Academico
class PeriodoBase(BaseModel):
    codigo: str
    fecha_inicio: datetime
    fecha_fin: datetime
    estado: str = "planificacion"

class PeriodoCreate(PeriodoBase):
    pass

class PeriodoResponse(PeriodoBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Health Check
@router.get("/health")
async def health_check():
    return {"status": "healthy", "module": "mod-programas-estudio"}

# Endpoints CRUD
@router.post("/programas", response_model=ProgramaResponse, status_code=status.HTTP_201_CREATED)
async def crear_programa(programa: ProgramaCreate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProgramaEstudio).where(ProgramaEstudio.codigo == programa.codigo))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un programa con este codigo")

    db_programa = ProgramaEstudio(**programa.model_dump())
    db.add(db_programa)
    await db.flush() # Para obtener ID antes de crear el outbox

    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="carrera.creada",
        payload={
            "id": db_programa.id,
            "nombre": db_programa.nombre,
            "codigo": db_programa.codigo,
            "metadata": {"request_id": request_id}
        }
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_programa)
    return db_programa

# Endpoints Periodos Academicos
@router.post("/periodos", response_model=PeriodoResponse, status_code=status.HTTP_201_CREATED)
async def crear_periodo(periodo: PeriodoCreate, request: Request, db: AsyncSession = Depends(get_db)):
    db_periodo = PeriodoAcademico(**periodo.model_dump())
    db.add(db_periodo)
    await db.flush()

    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="periodo.creado",
        payload={
            "id": db_periodo.id,
            "codigo": db_periodo.codigo,
            "estado": db_periodo.estado,
            "metadata": {"request_id": request_id}
        }
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_periodo)
    return db_periodo

@router.get("/periodos", response_model=List[PeriodoResponse])
async def obtener_periodos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PeriodoAcademico).order_by(PeriodoAcademico.fecha_inicio.desc()))
    return result.scalars().all()

@router.get("/programas", response_model=List[ProgramaResponse])
async def obtener_programas(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProgramaEstudio).order_by(ProgramaEstudio.nombre))
    return result.scalars().all()

@router.get("/programas/{programa_id}", response_model=ProgramaResponse)
async def obtener_programa(programa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProgramaEstudio).where(ProgramaEstudio.id == programa_id))
    programa = result.scalar_one_or_none()
    if not programa:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    return programa

@router.get("/programas/{programa_id}/estructura-completa")
async def obtener_estructura_completa(programa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProgramaEstudio).where(ProgramaEstudio.id == programa_id))
    programa = result.scalar_one_or_none()
    if not programa:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    result_config = await db.execute(
        select(ProgramaConfiguracion)
        .where(ProgramaConfiguracion.programa_id == programa_id)
        .order_by(ProgramaConfiguracion.periodo_academico)
    )
    configuraciones = result_config.scalars().all()

    result_modulos = await db.execute(
        select(ProgramaModulo)
        .where(ProgramaModulo.programa_id == programa_id)
        .order_by(ProgramaModulo.periodo, ProgramaModulo.orden)
    )
    modulos = result_modulos.scalars().all()

    modulos_con_unidades = []
    for modulo in modulos:
        result_unidades = await db.execute(
            select(ProgramaUnidad)
            .where(ProgramaUnidad.programa_modulo_id == modulo.id)
            .order_by(ProgramaUnidad.orden)
        )
        unidades = result_unidades.scalars().all()
        modulos_con_unidades.append({
            **{k: v for k, v in modulo.__dict__.items() if not k.startswith('_')},
            "unidades": [{k: v for k, v in u.__dict__.items() if not k.startswith('_')} for u in unidades]
        })

    result_requisitos = await db.execute(
        select(ProgramaRequisito)
        .where(ProgramaRequisito.programa_id == programa_id)
    )
    requisitos = result_requisitos.scalars().all()

    return {
        **{k: v for k, v in programa.__dict__.items() if not k.startswith('_')},
        "configuraciones": configuraciones,
        "modulos": modulos_con_unidades,
        "requisitos": requisitos
    }

@router.put("/programas/{programa_id}", response_model=ProgramaResponse)
async def actualizar_programa(programa_id: int, programa_data: ProgramaCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProgramaEstudio).where(ProgramaEstudio.id == programa_id))
    programa = result.scalar_one_or_none()
    if not programa:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    for field, value in programa_data.model_dump().items():
        setattr(programa, field, value)

    await db.commit()
    await db.refresh(programa)
    return programa

@router.post("/programas/{programa_id}/modulos", status_code=status.HTTP_201_CREATED)
async def agregar_modulo(programa_id: int, modulo_data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    db_modulo = ProgramaModulo(programa_id=programa_id, **modulo_data)
    db.add(db_modulo)
    await db.flush()

    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="malla.modulo_agregado",
        payload={
            "programa_id": programa_id,
            "modulo_id": db_modulo.id,
            "nombre": db_modulo.nombre,
            "metadata": {"request_id": request_id}
        }
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_modulo)
    return db_modulo

@router.post("/modulos/{modulo_id}/unidades", status_code=status.HTTP_201_CREATED)
async def agregar_unidad(modulo_id: int, unidad_data: dict, request: Request, db: AsyncSession = Depends(get_db)):
    db_unidad = ProgramaUnidad(programa_modulo_id=modulo_id, **unidad_data)
    db.add(db_unidad)
    await db.flush()

    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="malla.unidad_agregada",
        payload={
            "modulo_id": modulo_id,
            "unidad_id": db_unidad.id,
            "nombre": db_unidad.nombre,
            "metadata": {"request_id": request_id}
        }
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_unidad)
    return db_unidad

@router.get("/programas/{programa_id}/malla")
async def obtener_malla(programa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProgramaModulo)
        .where(ProgramaModulo.programa_id == programa_id)
        .order_by(ProgramaModulo.periodo)
    )
    modulos = result.scalars().all()

    malla = []
    for m in modulos:
        res_u = await db.execute(select(ProgramaUnidad).where(ProgramaUnidad.programa_modulo_id == m.id))
        unidades = res_u.scalars().all()
        malla.append({
            "id": m.id,
            "nombre": m.nombre,
            "periodo": m.periodo,
            "unidades": unidades
        })

    return malla

@router.delete("/programas/{programa_id}")
async def eliminar_programa(programa_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProgramaEstudio).where(ProgramaEstudio.id == programa_id))
    programa = result.scalar_one_or_none()
    if not programa:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    programa.estado = "inactivo"
    await db.commit()
    return {"message": "Programa eliminado correctamente"}
