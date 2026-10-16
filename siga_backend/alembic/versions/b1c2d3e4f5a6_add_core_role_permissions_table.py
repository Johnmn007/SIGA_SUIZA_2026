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
    op.create_table('core_role_permissions',
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('permission_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['core_roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['core_permissions.id'], ondelete='CASCADE')
    )


def downgrade() -> None:
    op.drop_table('core_role_permissions')
