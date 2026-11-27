"""Cuenta de acceso del alumno, creada al matricularlo.

Regla del instituto:
- Usuario: <DNI>@siga.edu   Contraseña inicial: su DNI.
- La primera matrícula (cachimbo) crea la cuenta con rol "estudiante".
- En las matrículas siguientes NO se crea otra ni se cambia la contraseña: si la cuenta estaba
  desactivada, se vuelve a activar con el mismo usuario y la contraseña que ya tenía.

Las cuentas viven en core_users / core_user_roles (misma base de datos que este módulo).
La ficha del alumno se enlaza con la cuenta por el correo <DNI>@siga.edu (ver seguridad.py).
"""
import logging
import re
from typing import Optional

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

DOMINIO_ALUMNOS = "siga.edu"


def correo_alumno(dni: str) -> Optional[str]:
    dni_limpio = re.sub(r"\D", "", str(dni or ""))
    return f"{dni_limpio}@{DOMINIO_ALUMNOS}" if dni_limpio else None


async def asegurar_cuenta_estudiante(db: AsyncSession, estudiante) -> Optional[dict]:
    """Crea o reactiva la cuenta del alumno. No hace commit: va en la misma transacción de la matrícula.

    Devuelve {"usuario", "creada", "reactivada", "contrasena_inicial"} o None si el alumno no tiene DNI.
    """
    correo = correo_alumno(getattr(estudiante, "dni", None))
    if not correo:
        return None
    dni_limpio = correo.split("@", 1)[0]

    fila = (await db.execute(
        text("SELECT id, is_active FROM core_users WHERE lower(email) = :c"), {"c": correo}
    )).first()

    creada = reactivada = False
    if fila:
        user_id, activa = fila[0], bool(fila[1])
        if not activa:
            await db.execute(
                text("UPDATE core_users SET is_active = true, updated_at = now() WHERE id = :u"), {"u": user_id}
            )
            reactivada = True
    else:
        nombre = " ".join(p for p in [str(estudiante.nombres or "").strip(), str(estudiante.apellidos or "").strip()] if p)
        hashed = bcrypt.hashpw(dni_limpio.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user_id = (await db.execute(
            text("""
                INSERT INTO core_users (email, full_name, hashed_password, is_active, is_superuser, created_at)
                VALUES (:c, :n, :h, true, false, now())
                RETURNING id
            """),
            {"c": correo, "n": nombre or correo, "h": hashed},
        )).scalar()
        creada = True

    # Rol estudiante (si la cuenta aún no lo tiene)
    rol_id = (await db.execute(text("SELECT id FROM core_roles WHERE name = 'estudiante'"))).scalar()
    if rol_id:
        tiene_rol = (await db.execute(
            text("SELECT 1 FROM core_user_roles WHERE user_id = :u AND role_id = :r"), {"u": user_id, "r": rol_id}
        )).first()
        if not tiene_rol:
            await db.execute(
                text("INSERT INTO core_user_roles (user_id, role_id) VALUES (:u, :r)"), {"u": user_id, "r": rol_id}
            )
    else:
        logger.warning("No existe el rol 'estudiante'; la cuenta %s quedó sin rol", correo)

    # Enlazar la ficha con su cuenta si aún no tiene correo institucional
    if not (getattr(estudiante, "email_institucional", None) or "").strip():
        estudiante.email_institucional = correo

    return {
        "usuario": correo,
        "creada": creada,
        "reactivada": reactivada,
        # Solo se informa cuando se acaba de crear: después el alumno pudo cambiarla.
        "contrasena_inicial": "su DNI" if creada else None,
    }
