"""add_evaluation_metrics

Revision ID: 3a1bf69f9454
Revises: bb44a3dc2f9d
Create Date: 2025-10-03 08:50:23.819234

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3a1bf69f9454'
down_revision: Union[str, None] = 'bb44a3dc2f9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add evaluation metrics support to results, configs, and queries tables."""

    # 1. Results table - add metrics storage
    op.add_column('results',
        sa.Column('metrics', postgresql.JSONB(), nullable=True, server_default='{}')
    )
    op.add_column('results',
        sa.Column('evaluation_cost_usd', sa.Numeric(10, 4), nullable=True, server_default='0')
    )
    op.add_column('results',
        sa.Column('evaluated_at', sa.DateTime(), nullable=True)
    )
    op.create_index('idx_results_metrics', 'results', ['metrics'],
                    postgresql_using='gin')

    # 2. Configs table - add evaluation settings
    op.add_column('configs',
        sa.Column('evaluation_settings', postgresql.JSONB(),
                  nullable=True,
                  server_default='{"use_llm_judge": false, "llm_judge_model": "gpt-3.5-turbo"}')
    )
    op.create_index('idx_configs_eval_settings', 'configs', ['evaluation_settings'],
                    postgresql_using='gin')

    # 3. Queries table - add ground truth chunk IDs
    op.add_column('queries',
        sa.Column('ground_truth_chunk_ids', postgresql.ARRAY(postgresql.UUID()),
                  nullable=True, server_default='{}')
    )


def downgrade() -> None:
    """Remove evaluation metrics support."""

    # Drop in reverse order
    op.drop_column('queries', 'ground_truth_chunk_ids')

    op.drop_index('idx_configs_eval_settings', table_name='configs')
    op.drop_column('configs', 'evaluation_settings')

    op.drop_index('idx_results_metrics', table_name='results')
    op.drop_column('results', 'evaluated_at')
    op.drop_column('results', 'evaluation_cost_usd')
    op.drop_column('results', 'metrics')
