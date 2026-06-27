from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from database import get_db, OutboxEvent
from models import PlanEstudio, ModuloPlan, UnidadPlan

router = APIRouter()

# Schemas Pydantic
class PlanBase(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    nivel_formativo: Optional[str] = None
    creditos_totales: Optional[int] = 0
    horas_totales: Optional[int] = 0
    fecha_aprobacion: Optional[date] = None
    resolucion_aprobacion: Optional[str] = None
    estado: str = "activo"

class PlanCreate(PlanBase):
    pass

class PlanResponse(PlanBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Health Check
@router.get("/health")
async def health_check():
    return {"status": "healthy", "module": "mod-planes-estudio"}

# Endpoints CRUD
@router.post("/planes", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def crear_plan(plan: PlanCreate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanEstudio).where(PlanEstudio.codigo == plan.codigo))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un plan con este codigo")

    db_plan = PlanEstudio(**plan.model_dump())
    db.add(db_plan)
    await db.flush()

    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="plan_estudio.creado",
        payload={
            "id": db_plan.id,
            "codigo": db_plan.codigo,
            "nombre": db_plan.nombre,
            "metadata": {"request_id": request_id}
        }
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_plan)
    return db_plan


@router.get("/planes", response_model=List[PlanResponse])
async def obtener_planes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanEstudio).order_by(PlanEstudio.nombre))
    return result.scalars().all()


@router.get("/planes/{plan_id}", response_model=PlanResponse)
async def obtener_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanEstudio).where(PlanEstudio.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    return plan


@router.get("/planes/{plan_id}/estructura")
async def obtener_estructura_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanEstudio).where(PlanEstudio.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    result_modulos = await db.execute(
        select(ModuloPlan).where(ModuloPlan.plan_id == plan_id).order_by(ModuloPlan.orden)
    )
    modulos = result_modulos.scalars().all()

    modulos_con_unidades = []
    for modulo in modulos:
        result_unidades = await db.execute(
            select(UnidadPlan).where(UnidadPlan.modulo_id == modulo.id).order_by(UnidadPlan.orden)
        )
        unidades = result_unidades.scalars().all()
        modulos_con_unidades.append({
            **{k: v for k, v in modulo.__dict__.items() if not k.startswith('_')},
            "unidades": [{k: v for k, v in u.__dict__.items() if not k.startswith('_')} for u in unidades]
        })

    return {
        **{k: v for k, v in plan.__dict__.items() if not k.startswith('_')},
        "modulos": modulos_con_unidades
    }
