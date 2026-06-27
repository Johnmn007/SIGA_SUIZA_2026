from fastapi import APIRouter, HTTPException, Depends, status, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from database import get_db, OutboxEvent
from models import PlanEstudio, ModuloPlan, UnidadPlan
from excel_parser import ExcelMineduParser

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

class ModuloBase(BaseModel):
    codigo: Optional[str] = None
    nombre: str
    horas: Optional[int] = 0
    creditos: Optional[int] = 0
    orden: Optional[int] = 0

class ModuloCreate(ModuloBase):
    pass

class ModuloResponse(ModuloBase):
    id: int
    plan_id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UnidadBase(BaseModel):
    codigo: Optional[str] = None
    nombre: str
    horas: Optional[int] = 0
    creditos: Optional[int] = 0
    tipo: Optional[str] = None
    orden: Optional[int] = 0

class UnidadCreate(UnidadBase):
    pass

class UnidadResponse(UnidadBase):
    id: int
    modulo_id: int
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

@router.put("/planes/{plan_id}", response_model=PlanResponse)
async def actualizar_plan(plan_id: int, plan: PlanBase, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanEstudio).where(PlanEstudio.id == plan_id))
    db_plan = result.scalar_one_or_none()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
        
    for key, value in plan.model_dump(exclude_unset=True).items():
        setattr(db_plan, key, value)
        
    event = OutboxEvent(
        event_type="plan_estudio.actualizado",
        payload={"id": db_plan.id, "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}}
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_plan)
    return db_plan

@router.post("/planes/importar-minedu")
async def importar_plan_minedu(request: Request, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Debe ser Excel (.xlsx o .xls)")
        
    contents = await file.read()
    success, data, message = ExcelMineduParser.parse_plan_estudio(contents)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
        
    # Verificar si el código ya existe
    result = await db.execute(select(PlanEstudio).where(PlanEstudio.codigo == data["codigo"]))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Ya existe un plan con el código {data['codigo']}")
        
    # Crear el plan
    plan_data = {k: v for k, v in data.items() if k != "modulos"}
    db_plan = PlanEstudio(**plan_data)
    db.add(db_plan)
    await db.flush()
    
    # Crear módulos y unidades
    for mod_data in data.get("modulos", []):
        unidades_data = mod_data.pop("unidades", [])
        db_modulo = ModuloPlan(**mod_data, plan_id=db_plan.id)
        db.add(db_modulo)
        await db.flush()
        
        for ud_data in unidades_data:
            db_unidad = UnidadPlan(**ud_data, modulo_id=db_modulo.id)
            db.add(db_unidad)
            
    # Registrar en Outbox
    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="plan_estudio.importado",
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
    
    return {
        "message": "Plan importado exitosamente",
        "plan_id": db_plan.id,
        "codigo": db_plan.codigo,
        "modulos_importados": len(data.get("modulos", []))
    }

@router.delete("/planes/{plan_id}")
async def eliminar_plan(plan_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanEstudio).where(PlanEstudio.id == plan_id))
    db_plan = result.scalar_one_or_none()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
        
    await db.delete(db_plan)
    event = OutboxEvent(
        event_type="plan_estudio.eliminado",
        payload={"id": plan_id, "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}}
    )
    db.add(event)
    await db.commit()
    return {"message": "Plan eliminado exitosamente"}

# --- Modulos ---
@router.post("/planes/{plan_id}/modulos", response_model=ModuloResponse, status_code=status.HTTP_201_CREATED)
async def agregar_modulo(plan_id: int, modulo: ModuloCreate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanEstudio).where(PlanEstudio.id == plan_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Plan no encontrado")
        
    db_modulo = ModuloPlan(**modulo.model_dump(), plan_id=plan_id)
    db.add(db_modulo)
    await db.flush()
    
    event = OutboxEvent(
        event_type="modulo_plan.creado",
        payload={"id": db_modulo.id, "plan_id": plan_id, "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}}
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_modulo)
    return db_modulo

@router.put("/modulos/{modulo_id}", response_model=ModuloResponse)
async def actualizar_modulo(modulo_id: int, modulo: ModuloBase, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModuloPlan).where(ModuloPlan.id == modulo_id))
    db_modulo = result.scalar_one_or_none()
    if not db_modulo:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
        
    for key, value in modulo.model_dump(exclude_unset=True).items():
        setattr(db_modulo, key, value)
        
    await db.commit()
    await db.refresh(db_modulo)
    return db_modulo

@router.delete("/modulos/{modulo_id}")
async def eliminar_modulo(modulo_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModuloPlan).where(ModuloPlan.id == modulo_id))
    db_modulo = result.scalar_one_or_none()
    if not db_modulo:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
        
    await db.delete(db_modulo)
    await db.commit()
    return {"message": "Módulo eliminado exitosamente"}

# --- Unidades ---
@router.post("/modulos/{modulo_id}/unidades", response_model=UnidadResponse, status_code=status.HTTP_201_CREATED)
async def agregar_unidad(modulo_id: int, unidad: UnidadCreate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ModuloPlan).where(ModuloPlan.id == modulo_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
        
    db_unidad = UnidadPlan(**unidad.model_dump(), modulo_id=modulo_id)
    db.add(db_unidad)
    await db.flush()
    
    event = OutboxEvent(
        event_type="unidad_plan.creado",
        payload={"id": db_unidad.id, "modulo_id": modulo_id, "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}}
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_unidad)
    return db_unidad

@router.put("/unidades/{unidad_id}", response_model=UnidadResponse)
async def actualizar_unidad(unidad_id: int, unidad: UnidadBase, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UnidadPlan).where(UnidadPlan.id == unidad_id))
    db_unidad = result.scalar_one_or_none()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
        
    for key, value in unidad.model_dump(exclude_unset=True).items():
        setattr(db_unidad, key, value)
        
    await db.commit()
    await db.refresh(db_unidad)
    return db_unidad

@router.delete("/unidades/{unidad_id}")
async def eliminar_unidad(unidad_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UnidadPlan).where(UnidadPlan.id == unidad_id))
    db_unidad = result.scalar_one_or_none()
    if not db_unidad:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
        
    await db.delete(db_unidad)
    await db.commit()
    return {"message": "Unidad eliminada exitosamente"}
