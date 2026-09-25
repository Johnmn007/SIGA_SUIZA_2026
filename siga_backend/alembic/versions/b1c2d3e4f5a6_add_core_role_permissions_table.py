"""add_core_role_permissions_table

Revision ID: b1c2d3e4f5a6
Revises: 123456789abc
Create Date: 2025-12-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = '123456789abc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # La tabla ya existe si proviene del dump de Railway
    pass


def downgrade() -> None:
    pass
