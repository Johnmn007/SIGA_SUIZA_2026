"""Add core_audit_logs table

Revision ID: 9ad6866dac6a
Revises: 36d3a7aeceab
Create Date: 2026-06-27 08:31:56.037592

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ad6866dac6a'
down_revision: Union[str, None] = '36d3a7aeceab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'core_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.String(length=50), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('request_id', sa.String(length=50), nullable=True),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_core_audit_logs_event_id'), 'core_audit_logs', ['event_id'], unique=True)
    op.create_index(op.f('ix_core_audit_logs_event_type'), 'core_audit_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_core_audit_logs_source'), 'core_audit_logs', ['source'], unique=False)
    op.create_index(op.f('ix_core_audit_logs_user_id'), 'core_audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_core_audit_logs_request_id'), 'core_audit_logs', ['request_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_core_audit_logs_request_id'), table_name='core_audit_logs')
    op.drop_index(op.f('ix_core_audit_logs_user_id'), table_name='core_audit_logs')
    op.drop_index(op.f('ix_core_audit_logs_source'), table_name='core_audit_logs')
    op.drop_index(op.f('ix_core_audit_logs_event_type'), table_name='core_audit_logs')
    op.drop_index(op.f('ix_core_audit_logs_event_id'), table_name='core_audit_logs')
    op.drop_table('core_audit_logs')