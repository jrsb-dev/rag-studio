"""Result model."""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import Integer, Float, ForeignKey, DateTime, ARRAY, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.database import Base


class Result(Base):
    """
    Result model for storing experiment results.

    New fields for evaluation metrics:
    - metrics: JSONB storing all evaluation metrics (basic IR, LLM judge, RAGAS)
    - evaluation_cost_usd: Cost of evaluation (LLM API calls)
    - evaluated_at: Timestamp of evaluation
    """

    __tablename__ = "results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    experiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False
    )
    config_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("configs.id"), nullable=False
    )
    query_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("queries.id"), nullable=False
    )
    retrieved_chunk_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False
    )
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    result_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # New evaluation fields
    metrics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    evaluation_cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(10, 4), nullable=True)
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    experiment: Mapped["Experiment"] = relationship("Experiment", back_populates="results")
    config: Mapped["Config"] = relationship("Config")
    query: Mapped["Query"] = relationship("Query")

    def __repr__(self) -> str:
        return f"<Result(id={self.id}, score={self.score})>"
