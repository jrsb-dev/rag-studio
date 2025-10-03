"""Experiment schemas."""

from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class ExperimentBase(BaseModel):
    """Base experiment schema."""

    name: str | None = Field(None, description="Experiment name")
    config_ids: list[UUID] = Field(..., min_length=1, description="Config IDs to test")
    query_ids: list[UUID] = Field(..., min_length=1, description="Query IDs to test")


class ExperimentCreate(ExperimentBase):
    """Schema for creating an experiment."""

    pass


class ExperimentResponse(ExperimentBase):
    """Schema for experiment responses."""

    id: UUID
    project_id: UUID
    status: str = Field(..., description="Status: 'pending', 'running', 'completed', 'failed'")
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None

    class Config:
        from_attributes = True


class ChunkResult(BaseModel):
    """Schema for chunk result in experiment."""

    id: UUID
    content: str
    score: float | None = None


class QueryResult(BaseModel):
    """Schema for query result in experiment."""

    query_id: UUID
    query_text: str
    chunks: list[ChunkResult]
    score: float | None = None
    latency_ms: int | None = None
    metrics: dict | None = None
    evaluation_cost_usd: float | None = None


class ConfigResult(BaseModel):
    """Schema for config result in experiment."""

    config_id: UUID
    config_name: str
    avg_score: float | None = None
    avg_latency_ms: int | None = None
    results: list[QueryResult]


class ExperimentResultsResponse(BaseModel):
    """Schema for experiment results."""

    experiment_id: UUID
    configs: list[ConfigResult]


class CostEstimateRequest(BaseModel):
    """Request schema for cost estimation."""

    num_queries: int = Field(..., ge=1, description="Number of queries")
    chunks_per_query: int = Field(5, ge=1, le=20, description="Chunks per query (top_k)")
    use_llm_judge: bool = Field(False, description="Use LLM judge evaluation")
    llm_judge_model: str = Field("gpt-3.5-turbo", description="LLM judge model")
    use_ragas: bool = Field(False, description="Use RAGAS evaluation")


class CostEstimateResponse(BaseModel):
    """Response schema for cost estimation."""

    estimated_cost_usd: float = Field(..., description="Estimated cost in USD")
    breakdown: dict[str, float] = Field(..., description="Cost breakdown by method")
    num_api_calls: int = Field(..., description="Total number of API calls")
