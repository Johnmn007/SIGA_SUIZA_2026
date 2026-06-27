from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db, OutboxEvent
from models import Estudiante, Matricula
from schemas import EstudianteCreate, EstudianteResponse, MatriculaCreate, MatriculaResponse
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/estudiantes/", response_model=EstudianteResponse, status_code=status.HTTP_201_CREATED)
async def crear_estudiante(request: Request, data: EstudianteCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Estudiante).where(
        or_(Estudiante.dni == data.dni, Estudiante.codigo_estudiante == data.codigo_estudiante)
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="DNI o Codigo ya existen")

    db_estudiante = Estudiante(**data.model_dump())
    db.add(db_estudiante)
    await db.flush()
    
    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "gestion_academica.estudiante.creado",
        "source": "mod-gestion-academica",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "data": {"id": db_estudiante.id, "dni": db_estudiante.dni, "nombre": f"{db_estudiante.nombres} {db_estudiante.apellidos}"},
        "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
    }
    
    db.add(OutboxEvent(event_type=event_payload["event_type"], payload=event_payload))
    await db.commit()
    await db.refresh(db_estudiante)
    return db_estudiante

@router.post("/matriculas/", response_model=MatriculaResponse, status_code=status.HTTP_201_CREATED)
async def realizar_matricula(request: Request, data: MatriculaCreate, db: AsyncSession = Depends(get_db)):
    db_matricula = Matricula(**data.model_dump())
    db.add(db_matricula)
    await db.flush()
    
    event_payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": "gestion_academica.matricula.confirmada",
        "source": "mod-gestion-academica",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "data": {"matricula_id": db_matricula.id, "estudiante_id": db_matricula.estudiante_id},
        "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
    }
    
    db.add(OutboxEvent(event_type=event_payload["event_type"], payload=event_payload))
    await db.commit()
    await db.refresh(db_matricula)
    return db_matricula
