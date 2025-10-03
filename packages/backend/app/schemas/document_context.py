"""Document context visualization schemas."""

from uuid import UUID
from pydantic import BaseModel, Field


class RetrievedChunkInfo(BaseModel):
    """Information about a retrieved chunk in context."""

    chunk_id: UUID
    chunk_index: int
    rank: int = Field(..., description="Rank in retrieval results (1-based)")
    score: float | None = Field(None, description="Retrieval or evaluation score")
    start_pos: int
    end_pos: int
    content: str


class DocumentContextResponse(BaseModel):
    """Document with retrieved chunks highlighted."""

    document_id: UUID
    document_filename: str
    full_text: str
    config_id: UUID
    config_name: str
    query_id: UUID | None = None
    query_text: str | None = None
    retrieved_chunks: list[RetrievedChunkInfo] = Field(
        default_factory=list, description="Chunks that were retrieved for this query"
    )
    all_chunks: list[dict] = Field(
        default_factory=list, description="All chunks in document (for context)"
    )
    total_chunks: int
    retrieved_count: int
