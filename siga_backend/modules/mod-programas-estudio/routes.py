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
    fecha_fin_matricula_regular: Optional[datetime] = None
    fecha_fin_matricula_extemporanea: Optional[datetime] = None

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

@router.put("/periodos/{periodo_id}/estado", response_model=PeriodoResponse)
async def actualizar_estado_periodo(periodo_id: int, estado: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PeriodoAcademico).where(PeriodoAcademico.id == periodo_id))
    db_periodo = result.scalar_one_or_none()
    if not db_periodo:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")
        
    db_periodo.estado = estado
    
    event = OutboxEvent(
        event_type="periodo.estado_actualizado",
        payload={
            "id": db_periodo.id,
            "codigo": db_periodo.codigo,
            "nuevo_estado": estado,
            "metadata": {"request_id": request.headers.get("X-Request-ID", "unknown")}
        }
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_periodo)
    return db_periodo

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
        
        unidades_dict = []
        for u in unidades:
            unidades_dict.append({
                "id": u.id,
                "nombre": u.nombre,
                "creditos": u.creditos,
                "horas": (u.horas_teoria or 0) + (u.horas_practica or 0),
                "orden": u.orden
            })
            
        malla.append({
            "id": m.id,
            "nombre": m.nombre,
            "periodo": m.periodo,
            "unidades": unidades_dict
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

# --- Schemas Coordinación (Carga Lectiva y Horarios) ---
class CargaLectivaBase(BaseModel):
    periodo_id: int
    docente_id: int
    unidad_didactica_id: int
    turno: Optional[str] = None
    seccion: Optional[str] = None
    estado: str = "borrador"

class CargaLectivaCreate(CargaLectivaBase):
    pass

class CargaLectivaResponse(CargaLectivaBase):
    id: int
    programa_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class HorarioPeriodoBase(BaseModel):
    periodo_id: int
    estado: str = "borrador"
    archivo_excel_url: str
    observaciones: Optional[str] = None

class HorarioPeriodoCreate(HorarioPeriodoBase):
    pass

class HorarioPeriodoResponse(HorarioPeriodoBase):
    id: int
    programa_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Endpoints Coordinación ---
from models import CargaLectiva, HorarioPeriodo

@router.post("/programas/{programa_id}/carga-lectiva", response_model=CargaLectivaResponse, status_code=status.HTTP_201_CREATED)
async def crear_carga_lectiva(programa_id: int, carga: CargaLectivaCreate, request: Request, db: AsyncSession = Depends(get_db)):
    db_carga = CargaLectiva(**carga.model_dump(), programa_id=programa_id)
    db.add(db_carga)
    await db.commit()
    await db.refresh(db_carga)
    return db_carga

@router.get("/programas/{programa_id}/carga-lectiva", response_model=List[CargaLectivaResponse])
async def listar_carga_lectiva(programa_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CargaLectiva)
        .where(CargaLectiva.programa_id == programa_id, CargaLectiva.periodo_id == periodo_id)
    )
    return result.scalars().all()

@router.get("/docentes/{docente_id}/carga-lectiva", response_model=List[CargaLectivaResponse])
async def listar_carga_docente(docente_id: int, periodo_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    query = select(CargaLectiva).where(CargaLectiva.docente_id == docente_id)
    if periodo_id:
        query = query.where(CargaLectiva.periodo_id == periodo_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/programas/{programa_id}/horarios", response_model=HorarioPeriodoResponse, status_code=status.HTTP_201_CREATED)
async def crear_horario(programa_id: int, horario: HorarioPeriodoCreate, request: Request, db: AsyncSession = Depends(get_db)):
    db_horario = HorarioPeriodo(**horario.model_dump(), programa_id=programa_id)
    db.add(db_horario)
    await db.commit()
    await db.refresh(db_horario)
    return db_horario

@router.get("/programas/{programa_id}/horarios", response_model=List[HorarioPeriodoResponse])
async def listar_horarios(programa_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(HorarioPeriodo)
        .where(HorarioPeriodo.programa_id == programa_id, HorarioPeriodo.periodo_id == periodo_id)
    )
    return result.scalars().all()

# --- Schemas Docente (Sílabo y Plan de Trabajo) ---
class SilaboBase(BaseModel):
    carga_lectiva_id: int
    estado: str = "borrador"
    archivo_url: Optional[str] = None
    observaciones: Optional[str] = None

class SilaboCreate(SilaboBase):
    pass

class SilaboResponse(SilaboBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PlanTrabajoDocenteBase(BaseModel):
    periodo_id: int
    programa_id: int
    docente_id: int
    estado: str = "borrador"
    archivo_url: Optional[str] = None
    observaciones: Optional[str] = None

class PlanTrabajoDocenteCreate(PlanTrabajoDocenteBase):
    pass

class PlanTrabajoDocenteResponse(PlanTrabajoDocenteBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Endpoints Docente (Sílabos y Planes) ---
from models import Silabo, PlanTrabajoDocente

@router.get("/docente/{docente_id}/carga-lectiva", response_model=List[CargaLectivaResponse])
async def obtener_carga_docente(docente_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CargaLectiva)
        .where(CargaLectiva.docente_id == docente_id, CargaLectiva.periodo_id == periodo_id)
    )
    return result.scalars().all()

@router.post("/silabos", response_model=SilaboResponse, status_code=status.HTTP_201_CREATED)
async def crear_silabo(silabo: SilaboCreate, db: AsyncSession = Depends(get_db)):
    db_silabo = Silabo(**silabo.model_dump())
    db.add(db_silabo)
    await db.commit()
    await db.refresh(db_silabo)
    return db_silabo

@router.get("/docente/{docente_id}/silabos", response_model=List[SilaboResponse])
async def listar_silabos_docente(docente_id: int, db: AsyncSession = Depends(get_db)):
    # Get silabos that belong to the teacher's carga lectiva
    result = await db.execute(
        select(Silabo)
        .join(CargaLectiva)
        .where(CargaLectiva.docente_id == docente_id)
    )
    return result.scalars().all()

@router.post("/planes-trabajo", response_model=PlanTrabajoDocenteResponse, status_code=status.HTTP_201_CREATED)
async def crear_plan_trabajo(plan: PlanTrabajoDocenteCreate, db: AsyncSession = Depends(get_db)):
    db_plan = PlanTrabajoDocente(**plan.model_dump())
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan)
    return db_plan

@router.get("/docente/{docente_id}/planes-trabajo", response_model=List[PlanTrabajoDocenteResponse])
async def listar_planes_trabajo(docente_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlanTrabajoDocente)
        .where(PlanTrabajoDocente.docente_id == docente_id, PlanTrabajoDocente.periodo_id == periodo_id)
    )
    return result.scalars().all()

# --- Endpoints Coordinador (Revisión) ---
@router.get("/programas/{programa_id}/silabos", response_model=List[SilaboResponse])
async def listar_silabos_programa(programa_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Silabo)
        .join(CargaLectiva)
        .where(CargaLectiva.programa_id == programa_id, CargaLectiva.periodo_id == periodo_id)
    )
    return result.scalars().all()

@router.get("/programas/{programa_id}/planes-trabajo", response_model=List[PlanTrabajoDocenteResponse])
async def listar_planes_programa(programa_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlanTrabajoDocente)
        .where(PlanTrabajoDocente.programa_id == programa_id, PlanTrabajoDocente.periodo_id == periodo_id)
    )
    return result.scalars().all()

@router.put("/silabos/{silabo_id}/estado", response_model=SilaboResponse)
async def actualizar_estado_silabo(silabo_id: int, estado: str, observaciones: str = None, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Silabo).where(Silabo.id == silabo_id))
    db_silabo = result.scalar_one_or_none()
    if not db_silabo:
        raise HTTPException(status_code=404, detail="Silabo no encontrado")
    
    db_silabo.estado = estado
    if observaciones is not None:
        db_silabo.observaciones = observaciones
        
    await db.commit()
    await db.refresh(db_silabo)
    return db_silabo

@router.put("/planes-trabajo/{plan_id}/estado", response_model=PlanTrabajoDocenteResponse)
async def actualizar_estado_plan(plan_id: int, estado: str, observaciones: str = None, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PlanTrabajoDocente).where(PlanTrabajoDocente.id == plan_id))
    db_plan = result.scalar_one_or_none()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
        
    db_plan.estado = estado
    if observaciones is not None:
        db_plan.observaciones = observaciones
        
    await db.commit()
    await db.refresh(db_plan)
    return db_plan

# --- Schemas y Endpoints (Tutorías) ---
class TutoriaBase(BaseModel):
    periodo_id: int
    programa_id: int
    docente_id: int
    ciclo: int
    observaciones: Optional[str] = None

class TutoriaCreate(TutoriaBase):
    pass

class TutoriaResponse(TutoriaBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

from models import Tutoria

@router.post("/programas/{programa_id}/tutorias", response_model=TutoriaResponse, status_code=status.HTTP_201_CREATED)
async def crear_tutoria(programa_id: int, tutoria: TutoriaCreate, db: AsyncSession = Depends(get_db)):
    db_tutoria = Tutoria(**tutoria.model_dump(), programa_id=programa_id)
    db.add(db_tutoria)
    await db.commit()
    await db.refresh(db_tutoria)
    return db_tutoria

@router.get("/programas/{programa_id}/tutorias", response_model=List[TutoriaResponse])
async def listar_tutorias(programa_id: int, periodo_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Tutoria)
        .where(Tutoria.programa_id == programa_id, Tutoria.periodo_id == periodo_id)
    )
    return result.scalars().all()

