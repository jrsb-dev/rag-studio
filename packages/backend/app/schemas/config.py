"""Config schemas."""

from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class ConfigBase(BaseModel):
    """Base config schema."""

    name: str = Field(..., min_length=1, max_length=255)
    chunk_strategy: str = Field(..., description="Chunking strategy: 'fixed', 'semantic', 'recursive'")
    chunk_size: int | None = Field(None, ge=1, le=8192, description="Chunk size in tokens")
    chunk_overlap: int | None = Field(None, ge=0, le=1000, description="Chunk overlap in tokens")
    embedding_model: str = Field(..., description="Embedding model: 'openai-ada-002', 'cohere-v3'")
    retrieval_strategy: str = Field(..., description="Retrieval strategy: 'dense', 'hybrid', 'bm25'")
    top_k: int = Field(5, ge=1, le=20, description="Number of chunks to retrieve")
    settings: dict | None = Field(None, description="Additional settings")
    evaluation_settings: dict | None = Field(None, description="Evaluation settings (LLM judge, RAGAS, etc.)")


class ConfigCreate(ConfigBase):
    """Schema for creating a config."""

    pass


class ConfigUpdate(BaseModel):
    """Schema for updating a config."""

    name: str | None = Field(None, min_length=1, max_length=255)
    top_k: int | None = Field(None, ge=1, le=20)
    settings: dict | None = None


class ConfigResponse(ConfigBase):
    """Schema for config responses."""

    id: UUID
    project_id: UUID
    created_at: datetime
    chunk_count: int | None = Field(None, description="Number of chunks generated")
    status: str | None = Field(None, description="Processing status: 'pending', 'processing', 'ready', 'failed'")

    class Config:
        from_attributes = True
