"""add_answer_generation_fields

Revision ID: 2cff95d83840
Revises: a41c24051a4b
Create Date: 2025-10-03 16:37:36.046319

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2cff95d83840'
down_revision: Union[str, None] = 'a41c24051a4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add answer generation fields to results table
    op.add_column('results', sa.Column('generated_answer', sa.Text(), nullable=True))
    op.add_column('results', sa.Column('generation_cost_usd', sa.Numeric(precision=10, scale=4), nullable=True))
    op.add_column('results', sa.Column('answer_metrics', sa.dialects.postgresql.JSONB(), nullable=True))
    op.add_column('results', sa.Column('generated_at', sa.DateTime(), nullable=True))

    # Add answer generation settings to configs table
    op.add_column('configs', sa.Column('generation_settings', sa.dialects.postgresql.JSONB(), nullable=True))
    op.add_column('configs', sa.Column('prompt_template', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove fields from configs table
    op.drop_column('configs', 'prompt_template')
    op.drop_column('configs', 'generation_settings')

    # Remove fields from results table
    op.drop_column('results', 'generated_at')
    op.drop_column('results', 'answer_metrics')
    op.drop_column('results', 'generation_cost_usd')
    op.drop_column('results', 'generated_answer')
