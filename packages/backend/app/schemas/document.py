"""Document schemas."""

from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class DocumentBase(BaseModel):
    """Base document schema."""

    filename: str = Field(..., min_length=1, max_length=255)
    file_type: str
    file_size: int
    doc_metadata: dict | None = Field(None, serialization_alias='metadata')


class DocumentCreate(BaseModel):
    """Schema for creating a document."""

    filename: str
    content: str
    file_type: str
    file_size: int
    doc_metadata: dict | None = None


class DocumentResponse(DocumentBase):
    """Schema for document responses."""

    id: UUID
    project_id: UUID
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }


class DocumentListResponse(BaseModel):
    """Schema for document upload response."""

    uploaded: int
    failed: int
    documents: list[DocumentResponse]

