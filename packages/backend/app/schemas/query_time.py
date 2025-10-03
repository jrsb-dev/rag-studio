"""Query-time experiment schemas."""

from uuid import UUID
from pydantic import BaseModel, Field


class QueryTimeOverrides(BaseModel):
    """
    Parameters that can be overridden at query time.

    These don't require re-processing chunks/embeddings.
    """

    top_k: int | None = Field(None, ge=1, le=50, description="Number of chunks to retrieve")
    dense_weight: float | None = Field(None, ge=0.0, le=1.0, description="Weight for dense retrieval in hybrid")
    sparse_weight: float | None = Field(None, ge=0.0, le=1.0, description="Weight for sparse retrieval in hybrid")


class QueryTimeExperimentRequest(BaseModel):
    """Request for running a query-time experiment."""

    config_id: UUID = Field(..., description="Base configuration to use")
    query_id: UUID | None = Field(None, description="Existing query to test")
    query_text: str | None = Field(None, description="Ad-hoc query text (if query_id not provided)")
    overrides: QueryTimeOverrides = Field(default_factory=QueryTimeOverrides, description="Parameter overrides")

    class Config:
        json_schema_extra = {
            "example": {
                "config_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "query_text": "What are the side effects of aspirin?",
                "overrides": {
                    "top_k": 10,
                    "dense_weight": 0.7,
                    "sparse_weight": 0.3
                }
            }
        }


class EffectiveParameters(BaseModel):
    """Merged config + overrides showing what was actually used."""

    top_k: int
    dense_weight: float | None = None
    sparse_weight: float | None = None
    retrieval_strategy: str
    embedding_model: str
    chunk_strategy: str
    chunk_size: int


class ChunkResponse(BaseModel):
    """Simplified chunk response for query-time experiments."""

    id: UUID
    content: str
    chunk_index: int
    similarity_score: float | None = None  # If available


class QueryTimeExperimentResponse(BaseModel):
    """Response from query-time experiment."""

    # Results
    retrieved_chunks: list[ChunkResponse]
    score: float | None = Field(None, description="Primary score for ranking")
    latency_ms: int

    # Metrics (same as regular results)
    metrics: dict = Field(default_factory=dict, description="Evaluation metrics")

    # What parameters were used
    effective_params: EffectiveParameters

    # Optional: trace data (if requested)
    trace: dict | None = None

    class Config:
        json_schema_extra = {
            "example": {
                "retrieved_chunks": [
                    {
                        "id": "chunk-uuid-1",
                        "content": "Common side effects include...",
                        "chunk_index": 5,
                        "similarity_score": 0.89
                    }
                ],
                "score": 0.82,
                "latency_ms": 234,
                "metrics": {
                    "ndcg": 0.78,
                    "mrr": 1.0,
                    "diversity": 0.65
                },
                "effective_params": {
                    "top_k": 10,
                    "dense_weight": 0.7,
                    "sparse_weight": 0.3,
                    "retrieval_strategy": "hybrid",
                    "embedding_model": "text-embedding-3-small",
                    "chunk_strategy": "fixed",
                    "chunk_size": 512
                }
            }
        }
