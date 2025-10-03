"""Queries API endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.query import QueryCreate, QueryUpdate, QueryResponse
from app.services.query_service import QueryService

router = APIRouter(prefix="/projects/{project_id}/queries", tags=["queries"])


@router.post("/", response_model=QueryResponse, status_code=status.HTTP_201_CREATED)
async def create_query(
    project_id: UUID,
    query: QueryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new test query."""
    service = QueryService(db)
    created_query = await service.create_query(project_id, query)
    return created_query


@router.get("/", response_model=list[QueryResponse])
async def list_queries(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """List queries for a project."""
    service = QueryService(db)
    queries = await service.list_queries(project_id)
    return queries


@router.get("/{query_id}", response_model=QueryResponse)
async def get_query(
    project_id: UUID,
    query_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get query by ID."""
    service = QueryService(db)
    query = await service.get_query(query_id)

    if not query or query.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query {query_id} not found",
        )

    return query


@router.patch("/{query_id}", response_model=QueryResponse)
async def update_query(
    project_id: UUID,
    query_id: UUID,
    query_data: QueryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update query by ID."""
    service = QueryService(db)
    query = await service.get_query(query_id)

    if not query or query.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query {query_id} not found",
        )

    updated_query = await service.update_query(query_id, query_data)
    return updated_query


@router.delete("/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_query(
    project_id: UUID,
    query_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete query by ID."""
    service = QueryService(db)
    query = await service.get_query(query_id)

    if not query or query.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Query {query_id} not found",
        )

    await service.delete_query(query_id)
