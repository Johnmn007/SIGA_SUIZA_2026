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
    conn = op.get_bind()
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS core_role_permissions (
            role_id INTEGER NOT NULL REFERENCES core_roles(id) ON DELETE CASCADE,
            permission_id INTEGER NOT NULL REFERENCES core_permissions(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
        );
    """))


def downgrade() -> None:
    op.drop_table('core_role_permissions')
