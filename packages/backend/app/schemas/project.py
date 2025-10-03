"""Project schemas."""

from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class ProjectBase(BaseModel):
    """Base project schema."""

    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: str | None = Field(None, description="Project description")


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""

    pass


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None


class ProjectResponse(ProjectBase):
    """Schema for project responses."""

    id: UUID
    created_at: datetime
    updated_at: datetime
    document_count: int | None = Field(None, description="Number of documents")
    config_count: int | None = Field(None, description="Number of configurations")

    class Config:
        from_attributes = True
