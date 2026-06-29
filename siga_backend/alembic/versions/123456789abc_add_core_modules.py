"""Add core_modules

Revision ID: 123456789abc
Revises: 9ad6866dac6a
Create Date: 2026-06-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '123456789abc'
down_revision: Union[str, None] = '9ad6866dac6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('core_modules',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('version', sa.String(length=20), nullable=False),
    sa.Column('api_version', sa.String(length=20), nullable=True),
    sa.Column('description', sa.String(length=255), nullable=True),
    sa.Column('endpoints', sa.JSON(), nullable=False),
    sa.Column('events', sa.JSON(), nullable=True),
    sa.Column('permissions', sa.JSON(), nullable=True),
    sa.Column('health_check', sa.String(length=100), nullable=True),
    sa.Column('config', sa.JSON(), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('registered_at', sa.DateTime(), nullable=True),
    sa.Column('last_health_check', sa.DateTime(), nullable=True),
    sa.Column('compliance_data', sa.JSON(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_core_modules_id'), 'core_modules', ['id'], unique=False)
    op.create_index(op.f('ix_core_modules_name'), 'core_modules', ['name'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_core_modules_name'), table_name='core_modules')
    op.drop_index(op.f('ix_core_modules_id'), table_name='core_modules')
    op.drop_table('core_modules')
