"""Query model."""

from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.database import Base


class Query(Base):
    """
    Query model for test queries.

    New field:
    - ground_truth_chunk_ids: Array of chunk UUIDs that should be retrieved (for precision/recall metrics)
    """

    __tablename__ = "queries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    ground_truth: Mapped[str | None] = mapped_column(Text, nullable=True)  # Legacy text field
    query_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # New ground truth field for IR metrics
    ground_truth_chunk_ids: Mapped[list[uuid.UUID] | None] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="queries")

    def __repr__(self) -> str:
        return f"<Query(id={self.id}, query_text={self.query_text[:50]})>"
