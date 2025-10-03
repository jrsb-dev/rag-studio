"""Chunk visualization schemas."""

from uuid import UUID
from pydantic import BaseModel, Field


class ChunkBoundary(BaseModel):
    """Represents a chunk boundary in the document."""

    chunk_id: UUID
    start_pos: int = Field(..., description="Character position where chunk starts in document")
    end_pos: int = Field(..., description="Character position where chunk ends in document")
    chunk_index: int = Field(..., description="Sequential index of chunk")
    content_preview: str = Field(..., description="First 100 characters of chunk content")
    token_count: int = Field(..., description="Number of tokens in chunk")
    metadata: dict = Field(default_factory=dict, description="Additional chunk metadata")


class OverlapRegion(BaseModel):
    """Represents an overlap between two consecutive chunks."""

    chunk_a_id: UUID = Field(..., description="First chunk ID")
    chunk_b_id: UUID = Field(..., description="Second chunk ID")
    start_pos: int = Field(..., description="Character position where overlap starts")
    end_pos: int = Field(..., description="Character position where overlap ends")
    overlap_text: str = Field(..., description="Overlapping text content")


class ChunkStatistics(BaseModel):
    """Statistics about the chunking for this document."""

    total_chunks: int
    avg_chunk_size: float = Field(..., description="Average chunk size in characters")
    min_chunk_size: int
    max_chunk_size: int
    total_overlap_chars: int = Field(default=0, description="Total characters in overlap regions")
    avg_overlap_size: float = Field(default=0.0, description="Average overlap size in characters")
    coverage: float = Field(..., description="Percentage of document covered by chunks (should be ~100%)")


class ChunkVisualizationResponse(BaseModel):
    """Complete chunk visualization data for a document."""

    document_id: UUID
    document_filename: str
    config_id: UUID
    config_name: str
    full_text: str = Field(..., description="Complete document text")
    total_length: int = Field(..., description="Total document length in characters")
    chunks: list[ChunkBoundary] = Field(default_factory=list, description="All chunk boundaries")
    overlaps: list[OverlapRegion] = Field(default_factory=list, description="Overlap regions between chunks")
    statistics: ChunkStatistics
    chunk_strategy: str = Field(..., description="Chunking strategy used (fixed/semantic/recursive)")
    chunk_size: int | None = Field(None, description="Configured chunk size in tokens")
    chunk_overlap: int | None = Field(None, description="Configured overlap in tokens")
