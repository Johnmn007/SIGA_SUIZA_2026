import re

path = "D:/SIGA/siga_backend/modules/mod-usuarios/routes.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Inject PersonalUpdate
update_class = """class PersonalUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    condicion_laboral: Optional[str] = None
    numero_resolucion: Optional[str] = None
    fecha_fin_contrato: Optional[datetime] = None
    cargo_funcional: Optional[str] = None
    profesion_titulo: Optional[str] = None
    programa_estudio_id: Optional[int] = None

class PersonalResponse(BaseModel):"""

content = content.replace("class PersonalResponse(BaseModel):", update_class)

# 2. Inject PUT endpoint
put_endpoint = """
@router.put("/personal/{perfil_id}", response_model=PersonalResponse)
async def actualizar_personal(perfil_id: int, personal: PersonalUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PerfilPersonal).options(selectinload(PerfilPersonal.usuario)).where(PerfilPersonal.id == perfil_id)
    )
    db_perfil = result.scalar_one_or_none()
    if not db_perfil:
        raise HTTPException(status_code=404, detail="Perfil de personal no encontrado")

    db_user = db_perfil.usuario
    update_data = personal.model_dump(exclude_unset=True)

    # Actualizar campos de Usuario
    if "email" in update_data and update_data["email"] != db_user.email:
        email_check = await db.execute(select(Usuario).where(Usuario.email == update_data["email"]))
        if email_check.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        db_user.email = update_data["email"]
    
    if "full_name" in update_data:
        db_user.full_name = update_data["full_name"]
    
    if "password" in update_data and update_data["password"]:
        db_user.hashed_password = pwd_context.hash(update_data["password"])

    # Si cambió el cargo, actualizar los roles
    if "cargo_funcional" in update_data and update_data["cargo_funcional"] != db_perfil.cargo_funcional:
        rol_names = ["docente"]
        if update_data["cargo_funcional"] == "SECRETARIA_PROGRAMA":
            rol_names = ["secretaria_programa"]
        elif update_data["cargo_funcional"] == "JEFE_AREA":
            rol_names = ["docente", "coordinador_programa"]
            
        roles_result = await db.execute(select(Rol).where(Rol.name.in_(rol_names)))
        db_user.roles = roles_result.scalars().all()

    # Actualizar campos de Perfil
    for key in ["condicion_laboral", "numero_resolucion", "fecha_fin_contrato", "cargo_funcional", "profesion_titulo", "programa_estudio_id"]:
        if key in update_data:
            setattr(db_perfil, key, update_data[key])

    request_id = request.headers.get("X-Request-ID", "unknown")
    event = OutboxEvent(
        event_type="personal.actualizado",
        payload={
            "user_id": db_user.id,
            "cargo": db_perfil.cargo_funcional,
            "metadata": {"request_id": request_id}
        }
    )
    db.add(event)
    await db.commit()
    
    # Recargar para la respuesta
    final_result = await db.execute(
        select(Usuario).options(selectinload(Usuario.roles)).where(Usuario.id == db_user.id)
    )
    final_user = final_result.scalar_one()
    return {"usuario": final_user, "perfil": db_perfil}

"""

# Insert before "obtener_personal"
content = content.replace("@router.get(\"/personal\", response_model=List[PersonalResponse])", put_endpoint + "\n@router.get(\"/personal\", response_model=List[PersonalResponse])")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
    
print("Added PUT /personal/{perfil_id} endpoint")
