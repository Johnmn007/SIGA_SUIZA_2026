from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
import uuid

from database import get_db, OutboxEvent
from models import RegistroEvaluacion
from schemas import RegistroEvaluacionCreate, RegistroEvaluacionResponse, RegistroEvaluacionUpdate

router = APIRouter()

def _calcular_promedio(c1, c2, c3):
    notas = [n for n in (c1, c2, c3) if n is not None]
    if not notas:
        return None
    return round(sum(notas) / len(notas))

def _determinar_estado(promedio):
    if promedio is None:
        return "cursando"
    return "aprobado" if promedio >= 13 else "desaprobado"

@router.post("/registros", response_model=RegistroEvaluacionResponse, status_code=status.HTTP_201_CREATED)
async def crear_registro(data: RegistroEvaluacionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.matricula_detalle_id == data.matricula_detalle_id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El registro de evaluación ya existe para esta matrícula")
    
    db_obj = RegistroEvaluacion(**data.model_dump())
    db_obj.nota_final = _calcular_promedio(db_obj.nota_c1, db_obj.nota_c2, db_obj.nota_c3)
    db_obj.estado = _determinar_estado(db_obj.nota_final)
    
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/registros/unidad/{unidad_id}/periodo/{periodo_id}", response_model=List[RegistroEvaluacionResponse])
async def listar_registros_por_unidad(unidad_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RegistroEvaluacion)
        .where(RegistroEvaluacion.unidad_didactica_id == unidad_id)
        .where(RegistroEvaluacion.periodo_id == periodo_id)
    )
    return result.scalars().all()

@router.put("/registros/{registro_id}", response_model=RegistroEvaluacionResponse)
async def actualizar_notas(registro_id: int, data: RegistroEvaluacionUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.id == registro_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Registro de evaluación no encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_obj, key, value)
        
    db_obj.nota_final = _calcular_promedio(db_obj.nota_c1, db_obj.nota_c2, db_obj.nota_c3)
    db_obj.estado = _determinar_estado(db_obj.nota_final)
    
    event = OutboxEvent(
        event_type="evaluacion.nota.actualizada",
        payload={
            "registro_id": db_obj.id,
            "matricula_detalle_id": db_obj.matricula_detalle_id,
            "estudiante_id": db_obj.estudiante_id,
            "nota_final": db_obj.nota_final,
            "estado": db_obj.estado,
            "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
        }
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.post("/registros/sync-matricula")
async def sincronizar_matriculas(payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    # Este endpoint simula ser llamado por un worker o NATS consumer para crear registros 
    # automáticamente cuando una matrícula es confirmada (consumiendo 'gestion_academica.matricula.confirmada')
    
    matricula_id = payload.get("matricula_id")
    estudiante_id = payload.get("estudiante_id")
    detalles = payload.get("detalles", []) # asumiendo que el evento provee detalles o se consultan
    periodo_id = payload.get("periodo_id")
    
    for det in detalles:
        result = await db.execute(select(RegistroEvaluacion).where(RegistroEvaluacion.matricula_detalle_id == det["id"]))
        if not result.scalar_one_or_none():
            db_obj = RegistroEvaluacion(
                matricula_detalle_id=det["id"],
                estudiante_id=estudiante_id,
                unidad_didactica_id=det["unidad_didactica_id"],
                periodo_id=periodo_id
            )
            db.add(db_obj)
            
    await db.commit()
    return {"message": "Sincronización completada"}
