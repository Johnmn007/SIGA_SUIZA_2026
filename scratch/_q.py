import asyncio
from sqlalchemy import text
from database import engine


async def main():
    async with engine.connect() as c:
        print("== matricula_detalles existentes: ids y unidades ==")
        for r in (await c.execute(text("""
            SELECT md.id, md.matricula_id, md.unidad_didactica_id, md.creditos, md.estado_curso
            FROM matricula_detalles md ORDER BY md.id
        """))).all():
            print(r)

        print("== columnas de matricula_detalles / estudiantes ==")
        for t in ("matricula_detalles", "estudiantes", "matriculas"):
            rows = (await c.execute(text(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_name = :t ORDER BY ordinal_position"), {"t": t})).all()
            print(t, "->", [f"{r[0]}:{r[1]}" for r in rows])

asyncio.run(main())
