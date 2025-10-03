"""Query schemas."""

from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class QueryBase(BaseModel):
    """Base query schema."""

    query_text: str = Field(..., min_length=1, description="Query text")
    ground_truth: str | None = Field(None, description="Expected answer for evaluation")
    ground_truth_chunk_ids: list[UUID] | None = Field(None, description="Ground truth chunk IDs for evaluation")
    query_metadata: dict | None = Field(None, serialization_alias='metadata')


class QueryCreate(QueryBase):
    """Schema for creating a query."""

    pass


class QueryUpdate(BaseModel):
    """Schema for updating a query."""

    query_text: str | None = Field(None, min_length=1)
    ground_truth: str | None = None
    ground_truth_chunk_ids: list[UUID] | None = None
    query_metadata: dict | None = None


class QueryResponse(QueryBase):
    """Schema for query responses."""

    id: UUID
    project_id: UUID
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }
