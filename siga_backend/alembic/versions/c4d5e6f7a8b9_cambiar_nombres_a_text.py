"""cambiar_nombres_a_text

Revision ID: c4d5e6f7a8b9
Revises: b1c2d3e4f5a6
Create Date: 2026-11-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COLUMNAS = [
    ("modulos_plan", "nombre"),
    ("unidades_plan", "nombre"),
    ("programa_modulos", "nombre"),
    ("programa_unidades", "nombre"),
]


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for tabla, columna in COLUMNAS:
        if inspector.has_table(tabla):
            op.alter_column(
                tabla,
                columna,
                existing_type=sa.String(length=255),
                type_=sa.Text(),
                existing_nullable=False,
            )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for tabla, columna in COLUMNAS:
        if inspector.has_table(tabla):
            op.alter_column(
                tabla,
                columna,
                existing_type=sa.Text(),
                type_=sa.String(length=255),
                existing_nullable=False,
                postgresql_using=f"left({columna}, 255)",
            )
