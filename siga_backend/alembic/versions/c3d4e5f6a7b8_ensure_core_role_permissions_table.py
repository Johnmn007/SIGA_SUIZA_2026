"""ensure_core_role_permissions_table

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a6
Create Date: 2026-11-05 00:00:00.000000

La revision anterior asumia que la tabla venia incluida en un dump externo.
En una base limpia la tabla no existe, por lo que el seeding de permisos
fallaba y, en cascada, tampoco se creaban los usuarios.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "core_role_permissions" not in inspector.get_table_names():
        op.create_table(
            "core_role_permissions",
            sa.Column("role_id", sa.Integer(), nullable=True),
            sa.Column("permission_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(
                ["role_id"], ["core_roles.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(
                ["permission_id"], ["core_permissions.id"], ondelete="CASCADE"
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "core_role_permissions" in inspector.get_table_names():
        op.drop_table("core_role_permissions")
