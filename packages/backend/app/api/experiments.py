"""Experiments API endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentResponse,
    ExperimentResultsResponse,
)
from app.services.experiment_service import ExperimentService

router = APIRouter(tags=["experiments"])


@router.post(
    "/projects/{project_id}/experiments",
    response_model=ExperimentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_experiment(
    project_id: UUID,
    experiment: ExperimentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create and run a new experiment."""
    service = ExperimentService(db)
    created_experiment = await service.create_experiment(project_id, experiment)
    return created_experiment


@router.get("/experiments/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(experiment_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get experiment by ID."""
    service = ExperimentService(db)
    experiment = await service.get_experiment(experiment_id)

    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment {experiment_id} not found",
        )

    return experiment


@router.get(
    "/experiments/{experiment_id}/results", response_model=ExperimentResultsResponse
)
async def get_experiment_results(experiment_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get experiment results."""
    service = ExperimentService(db)
    experiment = await service.get_experiment(experiment_id)

    if not experiment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment {experiment_id} not found",
        )

    results = await service.get_experiment_results(experiment_id)
    return results
