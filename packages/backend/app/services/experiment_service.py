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
from app.core.evaluation.evaluator import EvaluationService


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
        evaluation_service = EvaluationService(openai_api_key=api_key)

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
                    start_time = time.time()

                    # Retrieve chunks based on configured retrieval strategy
                    if config.retrieval_strategy == "dense":
                        # Dense retrieval: needs query embedding
                        query_embedding = await embedding_service.embed_single(
                            text=query.query_text,
                            model=config.embedding_model,
                        )
                        chunks = await retrieval_service.search_dense(
                            query_embedding=query_embedding,
                            config_id=config.id,
                            top_k=config.top_k,
                        )
                    elif config.retrieval_strategy == "bm25":
                        # BM25 retrieval: no embedding needed
                        chunks = await retrieval_service.search_bm25(
                            query_text=query.query_text,
                            config_id=config.id,
                            top_k=config.top_k,
                        )
                    elif config.retrieval_strategy == "hybrid":
                        # Hybrid retrieval: needs query embedding
                        query_embedding = await embedding_service.embed_single(
                            text=query.query_text,
                            model=config.embedding_model,
                        )
                        chunks = await retrieval_service.search_hybrid(
                            query_embedding=query_embedding,
                            query_text=query.query_text,
                            config_id=config.id,
                            top_k=config.top_k,
                        )
                    else:
                        raise ValueError(f"Unknown retrieval strategy: {config.retrieval_strategy}")
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

                # NEW: Run comprehensive evaluation
                evaluation_result = await evaluation_service.evaluate_retrieval(
                    query=query,
                    retrieved_chunks=chunks,
                    config=config,
                    top_k=config.top_k
                )

                # Get primary score for ranking
                primary_score = EvaluationService.get_primary_score(
                    evaluation_result["metrics"]
                )

                # Create result with new metrics
                result = Result(
                    experiment_id=experiment.id,
                    config_id=config.id,
                    query_id=query.id,
                    retrieved_chunk_ids=[chunk.id for chunk in chunks],
                    score=primary_score,  # Primary score for ranking
                    latency_ms=latency_ms,
                    metrics=evaluation_result["metrics"],  # NEW: Full metrics
                    evaluation_cost_usd=evaluation_result["total_cost_usd"],  # NEW: Cost
                    evaluated_at=datetime.utcnow(),  # NEW: Timestamp
                    result_metadata={
                        "num_chunks": len(chunks),
                        "config_name": config.name,
                        "query_text": query.query_text,
                    },
                )

                self.db.add(result)

        await self.db.commit()

    async def list_experiments(self, project_id: UUID) -> list[Experiment]:
        """List all experiments for a project."""
        query = (
            select(Experiment)
            .where(Experiment.project_id == project_id)
            .order_by(Experiment.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

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
                        "metrics": result.metrics,
                        "evaluation_cost_usd": float(result.evaluation_cost_usd) if result.evaluation_cost_usd else None,
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

    async def run_query_time_experiment(
        self,
        request: "QueryTimeExperimentRequest"
    ) -> "QueryTimeExperimentResponse":
        """
        Run instant retrieval with parameter overrides.

        This method:
        1. Loads the base config
        2. Merges config with overrides
        3. Runs retrieval using existing chunks
        4. Evaluates results
        5. Returns response (does NOT store in database)

        Args:
            request: QueryTimeExperimentRequest with config_id, query, and overrides

        Returns:
            QueryTimeExperimentResponse with results and effective parameters
        """
        from app.schemas.query_time import (
            QueryTimeExperimentResponse,
            EffectiveParameters,
            ChunkResponse,
        )
        from app.services.settings_service import SettingsService

        # Get config
        config_query = select(Config).where(Config.id == request.config_id)
        config_result = await self.db.execute(config_query)
        config = config_result.scalar_one_or_none()

        if not config:
            raise ValueError(f"Config {request.config_id} not found")

        # Get or create query object
        if request.query_id:
            query_query = select(Query).where(Query.id == request.query_id)
            query_result = await self.db.execute(query_query)
            query = query_result.scalar_one_or_none()
            if not query:
                raise ValueError(f"Query {request.query_id} not found")
        elif request.query_text:
            # Create temporary query object (not saved to DB)
            from app.models.query import Query as QueryModel
            query = QueryModel(
                project_id=config.project_id,
                query_text=request.query_text,
                ground_truth=None,
                ground_truth_chunk_ids=[]
            )
        else:
            raise ValueError("Either query_id or query_text must be provided")

        # Merge config with overrides
        effective_top_k = request.overrides.top_k or config.top_k
        effective_dense_weight = request.overrides.dense_weight or 0.5
        effective_sparse_weight = request.overrides.sparse_weight or 0.5

        # Get OpenAI API key
        settings_service = SettingsService(self.db)
        api_key = await settings_service.get_openai_key()

        if not api_key:
            raise ValueError("OpenAI API key not configured. Please set it in Settings.")

        # Initialize services
        embedding_service = EmbeddingService(api_key=api_key)
        retrieval_service = RetrievalService(self.db)
        evaluation_service = EvaluationService(openai_api_key=api_key)

        # Start timing
        import time
        start_time = time.time()

        # Generate query embedding (if needed for strategy)
        if config.retrieval_strategy in ("dense", "hybrid"):
            query_embedding = await embedding_service.embed_single(
                text=query.query_text,
                model=config.embedding_model
            )
        else:
            query_embedding = None

        # Run retrieval with overrides
        if config.retrieval_strategy == "dense":
            chunks = await retrieval_service.search_dense(
                query_embedding=query_embedding,
                config_id=config.id,
                top_k=effective_top_k
            )
        elif config.retrieval_strategy == "bm25":
            chunks = await retrieval_service.search_bm25(
                query_text=query.query_text,
                config_id=config.id,
                top_k=effective_top_k
            )
        elif config.retrieval_strategy == "hybrid":
            chunks = await retrieval_service.search_hybrid(
                query_embedding=query_embedding,
                query_text=query.query_text,
                config_id=config.id,
                top_k=effective_top_k,
                dense_weight=effective_dense_weight,
                sparse_weight=effective_sparse_weight
            )
        else:
            raise ValueError(f"Unknown retrieval strategy: {config.retrieval_strategy}")

        end_time = time.time()
        latency_ms = int((end_time - start_time) * 1000)

        # Run evaluation (same as regular experiments)
        evaluation_result = await evaluation_service.evaluate_retrieval(
            query=query,
            retrieved_chunks=chunks,
            config=config,
            top_k=effective_top_k
        )

        # Get primary score
        primary_score = EvaluationService.get_primary_score(
            evaluation_result["metrics"]
        )

        # Build response
        chunk_responses = []
        for i, chunk in enumerate(chunks):
            # Calculate similarity score if we have embeddings
            similarity_score = None
            if query_embedding and chunk.embedding:
                similarity_score = retrieval_service.calculate_score(
                    query_embedding,
                    chunk.embedding
                )

            chunk_responses.append(ChunkResponse(
                id=chunk.id,
                content=chunk.content,
                chunk_index=chunk.chunk_index,
                similarity_score=similarity_score
            ))

        # Build effective parameters
        effective_params = EffectiveParameters(
            top_k=effective_top_k,
            dense_weight=effective_dense_weight if config.retrieval_strategy == "hybrid" else None,
            sparse_weight=effective_sparse_weight if config.retrieval_strategy == "hybrid" else None,
            retrieval_strategy=config.retrieval_strategy,
            embedding_model=config.embedding_model,
            chunk_strategy=config.chunk_strategy,
            chunk_size=config.chunk_size
        )

        return QueryTimeExperimentResponse(
            retrieved_chunks=chunk_responses,
            score=primary_score,
            latency_ms=latency_ms,
            metrics=evaluation_result["metrics"],
            effective_params=effective_params
        )
