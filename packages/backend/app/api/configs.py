"""Configurations API endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.config import ConfigCreate, ConfigUpdate, ConfigResponse
from app.services.config_service import ConfigService
from app.models.chunk import Chunk
from sqlalchemy import select

router = APIRouter(prefix="/projects/{project_id}/configs", tags=["configs"])


@router.post("/", response_model=ConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_config(
    project_id: UUID,
    config: ConfigCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new RAG configuration."""
    service = ConfigService(db)
    created_config = await service.create_config(project_id, config)
    return created_config


@router.get("/", response_model=list[ConfigResponse])
async def list_configs(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """List configurations for a project."""
    service = ConfigService(db)
    configs = await service.list_configs(project_id)
    return configs


@router.get("/{config_id}", response_model=ConfigResponse)
async def get_config(
    project_id: UUID,
    config_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get configuration by ID."""
    service = ConfigService(db)
    config = await service.get_config(config_id)

    if not config or config.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Config {config_id} not found",
        )

    return config


@router.patch("/{config_id}", response_model=ConfigResponse)
async def update_config(
    project_id: UUID,
    config_id: UUID,
    config_data: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update configuration by ID."""
    service = ConfigService(db)
    config = await service.get_config(config_id)

    if not config or config.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Config {config_id} not found",
        )

    updated_config = await service.update_config(config_id, config_data)
    return updated_config


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(
    project_id: UUID,
    config_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete configuration by ID."""
    service = ConfigService(db)
    config = await service.get_config(config_id)

    if not config or config.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Config {config_id} not found",
        )

    await service.delete_config(config_id)


@router.get("/{config_id}/chunks", response_model=list[dict])
async def get_config_chunks(
    project_id: UUID,
    config_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get chunks for a configuration."""
    service = ConfigService(db)
    config = await service.get_config(config_id)

    if not config or config.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Config {config_id} not found",
        )

    # Get chunks for this config
    chunks_query = select(Chunk).where(Chunk.config_id == config_id).limit(100)
    chunks_result = await db.execute(chunks_query)
    chunks = chunks_result.scalars().all()

    return [
        {
            "id": str(chunk.id),
            "content": chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
            "document_id": str(chunk.document_id),
        }
        for chunk in chunks
    ]
