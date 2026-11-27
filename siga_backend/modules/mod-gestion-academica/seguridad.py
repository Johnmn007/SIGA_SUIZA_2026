"""Permisos por rol de Gestión Académica.

El gateway solo comprueba que el rol tenga permiso de lectura sobre el módulo; con eso,
cualquier cuenta (incluso de estudiante) podía leer los datos personales de todos los alumnos
y todos los pagos de Caja. Aquí se decide quién ve qué, a partir de la identidad firmada por
el gateway (shared.identity).
"""
import os
import sys

from fastapi import Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_RAIZ_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _RAIZ_BACKEND not in sys.path:
    sys.path.insert(0, _RAIZ_BACKEND)

from shared.identity import Identity, get_identity, es_superadmin  # noqa: E402
from database import get_db  # noqa: E402

# Roles que trabajan con el padrón completo de alumnos (Registro, Matrícula, Caja, Trámites, Admisión).
ROLES_PADRON = {"admin", "director", "secretaria_academica", "secretaria_programa", "admin_admision", "caja_tesoreria"}
# Roles que ven todos los pagos de Caja.
ROLES_CAJA = {"admin", "caja_tesoreria"}


def _tiene_rol(i: Identity, roles: set) -> bool:
    return es_superadmin(i) or bool(set(i.roles) & roles)


def es_personal(i: Identity) -> bool:
    """Cualquier rol del instituto distinto de estudiante."""
    return es_superadmin(i) or any(r != "estudiante" for r in i.roles)


async def identidad(request: Request, db: AsyncSession = Depends(get_db)) -> Identity:
    return await get_identity(request, db)


async def solo_padron(i: Identity = Depends(identidad)) -> Identity:
    if not _tiene_rol(i, ROLES_PADRON):
        raise HTTPException(status_code=403, detail="No tienes permiso para ver el padrón de estudiantes.")
    return i


async def solo_caja(i: Identity = Depends(identidad)) -> Identity:
    if not _tiene_rol(i, ROLES_CAJA):
        raise HTTPException(status_code=403, detail="No tienes permiso para ver los pagos de Caja.")
    return i


async def solo_personal(i: Identity = Depends(identidad)) -> Identity:
    if not es_personal(i):
        raise HTTPException(status_code=403, detail="Esta información es solo para el personal del instituto.")
    return i


async def id_ficha_propia(db: AsyncSession, i: Identity):
    """Id del alumno cuya ficha tiene el mismo correo que la cuenta (institucional o personal)."""
    correo = (await db.execute(text("SELECT email FROM core_users WHERE id = :u"), {"u": i.user_id})).scalar()
    if not correo:
        return None
    # También la cuenta automática del alumno: <DNI>@siga.edu (ver cuenta_estudiante.py)
    return (await db.execute(text(
        "SELECT id FROM estudiantes WHERE lower(trim(email_institucional)) = lower(trim(:c)) "
        "OR lower(trim(email_personal)) = lower(trim(:c)) "
        "OR lower(trim(:c)) = trim(dni) || '@siga.edu' ORDER BY id LIMIT 1"
    ), {"c": correo})).scalar()


async def acceso_estudiante(estudiante_id: int, i: Identity = Depends(identidad),
                            db: AsyncSession = Depends(get_db)) -> Identity:
    """El personal ve a cualquier alumno; un estudiante solo su propia ficha."""
    if es_personal(i):
        return i
    if await id_ficha_propia(db, i) == estudiante_id:
        return i
    raise HTTPException(status_code=403, detail="Solo puedes ver tu propia información.")
