"""Experiment service for business logic."""

import time
from datetime import datetime
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.experiment import Experiment
from app.models.result import Result
from app.models.query import Query
from app.models.config import Config
from app.models.chunk import Chunk
from app.schemas.experiment import ExperimentCreate
from app.core.embedding import EmbeddingService
from app.core.retrieval import RetrievalService


class ExperimentService:
    """Service for experiment-related operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def create_experiment(
        self, project_id: UUID, experiment_data: ExperimentCreate
    ) -> Experiment:
        """Create and run a new experiment."""
        # Create experiment
        experiment = Experiment(
            project_id=project_id,
            **experiment_data.model_dump(),
            status="running",
            started_at=datetime.utcnow(),
        )

        self.db.add(experiment)
        await self.db.commit()
        await self.db.refresh(experiment)

        # Run experiment
        try:
            await self._run_experiment(experiment)
            experiment.status = "completed"
            experiment.completed_at = datetime.utcnow()
        except Exception as e:
            experiment.status = "failed"
            experiment.error_message = str(e)
            experiment.completed_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(experiment)
        return experiment

    async def _run_experiment(self, experiment: Experiment) -> None:
        """Run experiment by testing all config/query combinations."""
        # Get OpenAI API key from settings
        from app.services.settings_service import SettingsService
        settings_service = SettingsService(self.db)
        api_key = await settings_service.get_openai_key()

        if not api_key:
            raise ValueError(
                "OpenAI API key not configured. Please set it in Settings."
            )

        embedding_service = EmbeddingService(api_key=api_key)
        retrieval_service = RetrievalService(self.db)

        # Get all queries
        queries_query = select(Query).where(Query.id.in_(experiment.query_ids))
        queries_result = await self.db.execute(queries_query)
        queries = list(queries_result.scalars().all())

        # Get all configs
        configs_query = select(Config).where(Config.id.in_(experiment.config_ids))
        configs_result = await self.db.execute(configs_query)
        configs = list(configs_result.scalars().all())

        # Test each config against each query
        for config in configs:
            for query in queries:
                try:
                    # Generate query embedding using the same model as the config
                    # This ensures dimension compatibility
                    start_time = time.time()
                    query_embedding = await embedding_service.embed_single(
                        text=query.query_text,
                        model=config.embedding_model,
                    )

                    # Retrieve chunks (dimension validation happens here)
                    chunks = await retrieval_service.search_dense(
                        query_embedding=query_embedding,
                        config_id=config.id,
                        top_k=config.top_k,
                    )
                except ValueError as e:
                    # Dimension mismatch or other validation error
                    # Skip this config/query combination and log the error
                    result = Result(
                        experiment_id=experiment.id,
                        config_id=config.id,
                        query_id=query.id,
                        retrieved_chunk_ids=[],
                        score=None,
                        latency_ms=0,
                        result_metadata={
                            "error": str(e),
                            "config_name": config.name,
                            "query_text": query.query_text,
                        },
                    )
                    self.db.add(result)
                    continue

                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)

                # Calculate average score
                if chunks:
                    scores = []
                    for chunk in chunks:
                        if chunk.embedding is not None:
                            score = await retrieval_service.calculate_score(
                                query_embedding, chunk.embedding
                            )
                            scores.append(score)

                    avg_score = sum(scores) / len(scores) if scores else None
                else:
                    avg_score = None

                # Create result
                result = Result(
                    experiment_id=experiment.id,
                    config_id=config.id,
                    query_id=query.id,
                    retrieved_chunk_ids=[chunk.id for chunk in chunks],
                    score=avg_score,
                    latency_ms=latency_ms,
                    result_metadata={
                        "num_chunks": len(chunks),
                        "config_name": config.name,
                        "query_text": query.query_text,
                    },
                )

                self.db.add(result)

        await self.db.commit()

    async def get_experiment(self, experiment_id: UUID) -> Experiment | None:
        """Get experiment by ID."""
        query = select(Experiment).where(Experiment.id == experiment_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_experiment_results(self, experiment_id: UUID) -> dict:
        """Get formatted experiment results."""
        experiment = await self.get_experiment(experiment_id)
        if not experiment:
            return {}

        # Get all results
        results_query = (
            select(Result)
            .where(Result.experiment_id == experiment_id)
            .order_by(Result.config_id, Result.query_id)
        )
        results_result = await self.db.execute(results_query)
        results = list(results_result.scalars().all())

        # Get configs and queries
        configs_query = select(Config).where(Config.id.in_(experiment.config_ids))
        configs_result = await self.db.execute(configs_query)
        configs = {c.id: c for c in configs_result.scalars().all()}

        queries_query = select(Query).where(Query.id.in_(experiment.query_ids))
        queries_result = await self.db.execute(queries_query)
        queries = {q.id: q for q in queries_result.scalars().all()}

        # Get all chunks for retrieved results
        chunk_ids = []
        for result in results:
            chunk_ids.extend(result.retrieved_chunk_ids)

        chunks_query = select(Chunk).where(Chunk.id.in_(chunk_ids))
        chunks_result = await self.db.execute(chunks_query)
        chunks = {c.id: c for c in chunks_result.scalars().all()}

        # Format results by config
        config_results = {}
        for config_id in experiment.config_ids:
            config = configs.get(config_id)
            if not config:
                continue

            config_data = {
                "config_id": str(config_id),
                "config_name": config.name,
                "results": [],
                "avg_score": None,
                "avg_latency_ms": None,
            }

            # Get results for this config
            config_results_list = [r for r in results if r.config_id == config_id]

            scores = []
            latencies = []

            for result in config_results_list:
                query = queries.get(result.query_id)
                if not query:
                    continue

                # Get chunks for this result
                result_chunks = []
                for chunk_id in result.retrieved_chunk_ids:
                    chunk = chunks.get(chunk_id)
                    if chunk:
                        result_chunks.append(
                            {
                                "id": str(chunk.id),
                                "content": chunk.content[:200] + "..."
                                if len(chunk.content) > 200
                                else chunk.content,
                                "score": None,  # Could calculate individual chunk scores
                            }
                        )

                config_data["results"].append(
                    {
                        "query_id": str(result.query_id),
                        "query_text": query.query_text,
                        "chunks": result_chunks,
                        "score": result.score,
                        "latency_ms": result.latency_ms,
                    }
                )

                if result.score is not None:
                    scores.append(result.score)
                if result.latency_ms is not None:
                    latencies.append(result.latency_ms)

            # Calculate averages
            if scores:
                config_data["avg_score"] = sum(scores) / len(scores)
            if latencies:
                config_data["avg_latency_ms"] = int(sum(latencies) / len(latencies))

            config_results[str(config_id)] = config_data

        return {
            "experiment_id": str(experiment.id),
            "configs": list(config_results.values()),
        }
