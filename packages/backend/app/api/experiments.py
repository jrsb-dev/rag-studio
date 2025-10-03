"""Experiments API endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentResponse,
    ExperimentResultsResponse,
    CostEstimateRequest,
    CostEstimateResponse,
)
from app.schemas.query_time import (
    QueryTimeExperimentRequest,
    QueryTimeExperimentResponse,
)
from app.services.experiment_service import ExperimentService
from app.core.evaluation.llm_evaluator import LLMJudgeEvaluator

router = APIRouter(tags=["experiments"])


@router.get("/projects/{project_id}/experiments", response_model=list[ExperimentResponse])
async def list_experiments(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """List all experiments for a project."""
    service = ExperimentService(db)
    experiments = await service.list_experiments(project_id)
    return experiments


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


@router.post("/experiments/estimate-cost", response_model=CostEstimateResponse)
async def estimate_cost(request: CostEstimateRequest):
    """Estimate cost for experiment evaluation."""
    total_cost = 0.0
    breakdown = {}

    # Calculate LLM judge cost
    if request.use_llm_judge:
        llm_cost = LLMJudgeEvaluator.estimate_cost(
            num_queries=request.num_queries,
            chunks_per_query=request.chunks_per_query,
            model=request.llm_judge_model
        )
        breakdown["llm_judge"] = llm_cost
        total_cost += llm_cost

    # Calculate RAGAS cost (future)
    if request.use_ragas:
        # TODO: Implement RAGAS cost estimation
        breakdown["ragas"] = 0.0

    # Calculate number of API calls
    num_api_calls = 0
    if request.use_llm_judge:
        num_api_calls += request.num_queries * request.chunks_per_query

    return CostEstimateResponse(
        estimated_cost_usd=round(total_cost, 4),
        breakdown=breakdown,
        num_api_calls=num_api_calls
    )


@router.post("/experiments/query-time", response_model=QueryTimeExperimentResponse)
async def run_query_time_experiment(
    request: QueryTimeExperimentRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Run instant retrieval experiment with parameter overrides.

    This endpoint allows testing different retrieval parameters (top_k, weights)
    without creating a new config or reprocessing chunks. Results are computed
    instantly and not stored in the database.

    Use cases:
    - Quickly test if top_k=10 works better than top_k=5
    - Experiment with hybrid search weights (dense vs sparse)
    - Try variations before committing to a full config

    Returns results immediately (typically <1 second) with full evaluation metrics.
    """
    service = ExperimentService(db)

    try:
        result = await service.run_query_time_experiment(request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run query-time experiment: {str(e)}"
        )
