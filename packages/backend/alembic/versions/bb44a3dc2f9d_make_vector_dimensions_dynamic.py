"""make_vector_dimensions_dynamic

Revision ID: bb44a3dc2f9d
Revises: 0eec8bc5b2e0
Create Date: 2025-10-02 14:42:36.602054

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb44a3dc2f9d'
down_revision: Union[str, None] = '0eec8bc5b2e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Make vector dimensions dynamic to support multiple embedding models.

    Changes:
    - Drop existing chunks table (MVP - no data preservation needed)
    - Recreate with vector() column (no fixed dimension)
    - Recreate indices
    """
    # Drop existing chunks table and its dependencies
    op.execute('DROP TABLE IF EXISTS chunks CASCADE')

    # Recreate chunks table with dynamic vector column
    op.execute('''
        CREATE TABLE chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            config_id UUID NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            embedding vector,
            chunk_metadata JSONB,
            chunk_index INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ''')

    # Recreate indices
    op.execute('CREATE INDEX idx_chunks_document_id ON chunks(document_id)')
    op.execute('CREATE INDEX idx_chunks_config_id ON chunks(config_id)')

    # Note: Vector indices will be created per dimension as needed
    # We'll handle this dynamically based on actual data


def downgrade() -> None:
    """
    Revert to fixed 3072 dimension vectors.

    Note: This will drop all chunks data.
    """
    # Drop existing chunks table
    op.execute('DROP TABLE IF EXISTS chunks CASCADE')

    # Recreate with fixed 3072 dimensions
    op.execute('''
        CREATE TABLE chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            config_id UUID NOT NULL REFERENCES configs(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            embedding vector(3072),
            chunk_metadata JSONB,
            chunk_index INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ''')

    # Recreate indices
    op.execute('CREATE INDEX idx_chunks_document_id ON chunks(document_id)')
    op.execute('CREATE INDEX idx_chunks_config_id ON chunks(config_id)')
    op.execute('CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)')
