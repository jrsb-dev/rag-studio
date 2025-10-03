"""Update vector dimensions to 3072

Revision ID: 0eec8bc5b2e0
Revises: d1fd168f4ea4
Create Date: 2025-10-02 14:23:32.030668

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0eec8bc5b2e0'
down_revision: Union[str, None] = 'd1fd168f4ea4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update the vector column to support 3072 dimensions (for text-embedding-3-large)
    op.execute('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(3072)')


def downgrade() -> None:
    # Revert back to 1536 dimensions
    op.execute('ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536)')
