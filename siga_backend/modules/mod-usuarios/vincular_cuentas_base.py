"""Vincula las cuentas base de demostración a una carrera.

Las cuentas secretaria_prog, coordinador y docente se crean sin perfil de personal,
así que no tienen programa_id y sus pantallas salen vacías. Este paso les crea el
perfil apuntando a Desarrollo de Sistemas de Información ("Computación").

Solo crea perfiles que faltan: nunca modifica uno existente. Si la carrera aún no
existe (base nueva, planes sin importar), reintenta más tarde.
"""
import asyncio

from sqlalchemy import text

from database import AsyncSessionLocal

CUENTAS_BASE = [
    ("secretaria_prog@siga.edu", "SECRETARIA_PROGRAMA"),
    ("coordinador@siga.edu", "JEFE_AREA"),
    ("docente@siga.edu", "DOCENTE"),
]

_SQL_CARRERA = text(
    "SELECT id FROM programas_estudio "
    "WHERE upper(nombre) LIKE '%SISTEMAS DE INFORMACI%' ORDER BY id LIMIT 1"
)


async def vincular_una_vez() -> bool:
    """Devuelve True cuando ya no queda nada por vincular."""
    async with AsyncSessionLocal() as db:
        carrera = (await db.execute(_SQL_CARRERA)).scalar()
        if carrera is None:
            return False
        for email, cargo in CUENTAS_BASE:
            user_id = (await db.execute(
                text("SELECT id FROM core_users WHERE email = :e"), {"e": email}
            )).scalar()
            if user_id is None:
                continue
            tiene_perfil = (await db.execute(
                text("SELECT 1 FROM perfiles_personal WHERE user_id = :u"), {"u": user_id}
            )).scalar()
            if tiene_perfil:
                continue
            await db.execute(text(
                "INSERT INTO perfiles_personal (user_id, condicion_laboral, cargo_funcional, "
                "profesion_titulo, programa_estudio_id) "
                "VALUES (:u, 'NOMBRADO', :c, 'Docente', :p)"
            ), {"u": user_id, "c": cargo, "p": carrera})
            print(f"Cuenta base {email} vinculada a la carrera {carrera}")
        await db.commit()
        return True


async def vincular_cuentas_base(intentos: int = 30, espera: int = 120):
    for _ in range(intentos):
        try:
            if await vincular_una_vez():
                return
        except Exception as exc:  # tablas aún no creadas en una base nueva
            print(f"Vincular cuentas base: reintento pendiente ({exc.__class__.__name__})")
        await asyncio.sleep(espera)
