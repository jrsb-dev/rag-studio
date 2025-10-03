"""Similarity matrix schemas."""

from uuid import UUID
from pydantic import BaseModel, Field


class ChunkSimilarityPair(BaseModel):
    """Similarity between two chunks."""

    chunk_a_id: UUID
    chunk_b_id: UUID
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="Cosine similarity score")


class SimilarityMatrixResponse(BaseModel):
    """Similarity matrix for chunks in a document."""

    document_id: UUID
    config_id: UUID
    chunk_ids: list[UUID] = Field(..., description="Ordered list of chunk IDs")
    similarity_matrix: list[list[float]] = Field(
        ..., description="NxN matrix of similarity scores"
    )
    avg_similarity: float = Field(..., description="Average similarity across all pairs")
    min_similarity: float = Field(..., description="Minimum similarity (most dissimilar pair)")
    max_similarity: float = Field(..., description="Maximum similarity (excluding self)")
    discontinuities: list[dict] = Field(
        default_factory=list,
        description="Pairs with low similarity (semantic jumps)",
    )
