"""Config model."""

from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.database import Base


class Config(Base):
    """Configuration model for RAG settings."""

    __tablename__ = "configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    chunk_strategy: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # 'fixed', 'semantic', 'recursive'
    chunk_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_overlap: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embedding_model: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # 'openai-ada-002', 'cohere-v3'
    retrieval_strategy: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # 'dense', 'hybrid', 'bm25'
    top_k: Mapped[int] = mapped_column(Integer, default=5)
    settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="configs")
    chunks: Mapped[list["Chunk"]] = relationship(
        "Chunk", back_populates="config", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Config(id={self.id}, name={self.name})>"
