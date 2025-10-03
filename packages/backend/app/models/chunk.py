"""Chunk model."""

from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
import uuid

from app.database import Base


class Chunk(Base):
    """
    Chunk model for storing document chunks with embeddings.

    The embedding column uses dynamic vector dimensions to support
    multiple embedding models (1536, 3072, etc.). The actual dimension
    is stored in chunk_metadata['embedding_dim'] for validation.
    """

    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    config_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("configs.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(), nullable=True)
    chunk_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="chunks")
    config: Mapped["Config"] = relationship("Config", back_populates="chunks")

    def __repr__(self) -> str:
        return f"<Chunk(id={self.id}, document_id={self.document_id}, config_id={self.config_id})>"
