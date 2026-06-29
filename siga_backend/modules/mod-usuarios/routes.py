from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr
from passlib.context import CryptContext
from database import get_db, OutboxEvent
from models import Usuario, Rol, Permiso

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()

# Schemas Pydantic
class RolBase(BaseModel):
    name: str
    description: Optional[str] = None

class RolCreate(RolBase):
    pass

class RolResponse(RolBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UsuarioBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    is_superuser: bool = False

class UsuarioCreate(UsuarioBase):
    password: str
    role_ids: List[int] = []

class UsuarioUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    role_ids: Optional[List[int]] = None

class UsuarioResponse(UsuarioBase):
    id: int
    created_at: datetime
    roles: List[RolResponse] = []
    model_config = ConfigDict(from_attributes=True)


# Health Check
@router.get("/health")
async def health_check():
    return {"status": "healthy", "module": "mod-usuarios"}


# --- CRUD Roles ---
@router.post("/roles", response_model=RolResponse, status_code=status.HTTP_201_CREATED)
async def crear_rol(rol: RolCreate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rol).where(Rol.name == rol.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El rol ya existe")

    db_rol = Rol(**rol.model_dump())
    db.add(db_rol)
    await db.flush()

    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="rol.creado",
        payload={"id": db_rol.id, "name": db_rol.name, "metadata": {"request_id": request_id}}
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_rol)
    return db_rol

@router.get("/roles", response_model=List[RolResponse])
async def obtener_roles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rol).order_by(Rol.name))
    return result.scalars().all()


# --- CRUD Usuarios ---
@router.post("/usuarios", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_usuario(usuario: UsuarioCreate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == usuario.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    user_data = usuario.model_dump(exclude={"password", "role_ids"})
    hashed_password = pwd_context.hash(usuario.password)
    
    db_user = Usuario(**user_data, hashed_password=hashed_password)
    
    # Asignar roles
    if usuario.role_ids:
        roles_result = await db.execute(select(Rol).where(Rol.id.in_(usuario.role_ids)))
        db_user.roles = roles_result.scalars().all()

    db.add(db_user)
    await db.flush()

    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="usuario.creado",
        payload={
            "id": db_user.id,
            "email": db_user.email,
            "full_name": db_user.full_name,
            "metadata": {"request_id": request_id}
        }
    )
    db.add(event)
    await db.commit()
    
    # Recargar con relaciones
    result = await db.execute(
        select(Usuario).options(selectinload(Usuario.roles)).where(Usuario.id == db_user.id)
    )
    return result.scalar_one()

@router.get("/usuarios", response_model=List[UsuarioResponse])
async def obtener_usuarios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Usuario).options(selectinload(Usuario.roles)).order_by(Usuario.created_at.desc())
    )
    return result.scalars().all()

@router.get("/usuarios/{usuario_id}", response_model=UsuarioResponse)
async def obtener_usuario(usuario_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Usuario).options(selectinload(Usuario.roles)).where(Usuario.id == usuario_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

@router.put("/usuarios/{usuario_id}", response_model=UsuarioResponse)
async def actualizar_usuario(usuario_id: int, usuario: UsuarioUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Usuario).options(selectinload(Usuario.roles)).where(Usuario.id == usuario_id)
    )
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = usuario.model_dump(exclude_unset=True)
    
    if "email" in update_data and update_data["email"] != db_user.email:
        email_check = await db.execute(select(Usuario).where(Usuario.email == update_data["email"]))
        if email_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El email ya está en uso por otro usuario")

    # Actualizar roles
    if "role_ids" in update_data:
        role_ids = update_data.pop("role_ids")
        roles_result = await db.execute(select(Rol).where(Rol.id.in_(role_ids)))
        db_user.roles = roles_result.scalars().all()

    # Actualizar campos
    for key, value in update_data.items():
        setattr(db_user, key, value)

    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="usuario.actualizado",
        payload={"id": db_user.id, "metadata": {"request_id": request_id}}
    )
    db.add(event)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.delete("/usuarios/{usuario_id}")
async def eliminar_usuario(usuario_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.id == usuario_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Eliminación lógica
    db_user.is_active = False
    
    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="usuario.eliminado",
        payload={"id": db_user.id, "metadata": {"request_id": request_id}}
    )
    db.add(event)
    await db.commit()
    return {"message": "Usuario desactivado correctamente"}
