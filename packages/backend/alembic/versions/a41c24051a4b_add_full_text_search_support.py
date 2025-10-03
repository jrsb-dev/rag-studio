"""add_full_text_search_support

Revision ID: a41c24051a4b
Revises: 3a1bf69f9454
Create Date: 2025-10-03 14:06:50.432974

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a41c24051a4b'
down_revision: Union[str, None] = '3a1bf69f9454'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add full-text search support to chunks table."""

    # Add tsvector column for full-text search
    op.add_column('chunks',
        sa.Column('content_tsv', sa.dialects.postgresql.TSVECTOR(), nullable=True)
    )

    # Create GIN index for fast full-text search
    op.create_index('idx_chunks_content_tsv', 'chunks', ['content_tsv'],
                    postgresql_using='gin')

    # Create trigger to automatically update tsvector when content changes
    op.execute("""
        CREATE OR REPLACE FUNCTION chunks_content_tsv_trigger() RETURNS trigger AS $$
        begin
          new.content_tsv := to_tsvector('english', coalesce(new.content, ''));
          return new;
        end
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER chunks_content_tsv_update BEFORE INSERT OR UPDATE
        ON chunks FOR EACH ROW EXECUTE FUNCTION chunks_content_tsv_trigger();
    """)

    # Populate existing rows
    op.execute("""
        UPDATE chunks SET content_tsv = to_tsvector('english', content);
    """)


def downgrade() -> None:
    """Remove full-text search support."""

    # Drop trigger and function
    op.execute("DROP TRIGGER IF EXISTS chunks_content_tsv_update ON chunks;")
    op.execute("DROP FUNCTION IF EXISTS chunks_content_tsv_trigger();")

    # Drop index and column
    op.drop_index('idx_chunks_content_tsv', table_name='chunks')
    op.drop_column('chunks', 'content_tsv')
