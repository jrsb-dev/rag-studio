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
from app.models.document import Document
from app.schemas.experiment import ExperimentCreate
from app.schemas.document_context import DocumentContextResponse, RetrievedChunkInfo
from app.core.embedding import EmbeddingService
from app.core.retrieval import RetrievalService
from app.core.evaluation.evaluator import EvaluationService
from app.core.generation import AnswerGenerationService
from app.core.evaluation.answer_evaluator import AnswerQualityEvaluator


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
        generation_service = AnswerGenerationService(api_key=api_key)
        answer_evaluator = AnswerQualityEvaluator(api_key=api_key)

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

                # PHASE 2: Answer Generation (if enabled in config)
                generated_answer = None
                generation_cost = 0.0
                answer_metrics = None

                generation_settings = config.generation_settings or {}
                if generation_settings.get("enabled", False):
                    # Generate answer from chunks
                    generation_result = await generation_service.generate_answer(
                        query_text=query.query_text,
                        chunks=chunks,
                        model=generation_settings.get("model", "gpt-4o-mini"),
                        temperature=generation_settings.get("temperature", 0.0),
                        max_tokens=generation_settings.get("max_tokens", 500),
                        prompt_template=config.prompt_template,
                    )

                    generated_answer = generation_result.get("answer")
                    generation_cost = generation_result.get("cost_usd", 0.0)

                    # PHASE 3: Answer Quality Evaluation (if answer was generated)
                    if generated_answer and not generation_result.get("error"):
                        answer_eval = await answer_evaluator.evaluate(
                            query_text=query.query_text,
                            generated_answer=generated_answer,
                            chunks=chunks,
                        )

                        # Combine generation metadata with evaluation
                        answer_metrics = {
                            **answer_eval,
                            "generation_model": generation_result.get("model"),
                            "temperature": generation_result.get("temperature"),
                            "prompt_tokens": generation_result.get("prompt_tokens"),
                            "completion_tokens": generation_result.get("completion_tokens"),
                            "prompt_sent": generation_result.get("prompt_sent"),  # Full prompt
                        }
                        generation_cost += answer_eval.get("evaluation_cost_usd", 0.0)

                # Create result with new metrics
                result = Result(
                    experiment_id=experiment.id,
                    config_id=config.id,
                    query_id=query.id,
                    retrieved_chunk_ids=[chunk.id for chunk in chunks],
                    score=primary_score,  # Primary score for ranking
                    latency_ms=latency_ms,
                    metrics=evaluation_result["metrics"],  # Retrieval metrics
                    evaluation_cost_usd=evaluation_result["total_cost_usd"],
                    evaluated_at=datetime.utcnow(),
                    # Answer generation fields
                    generated_answer=generated_answer,
                    generation_cost_usd=generation_cost if generated_answer else None,
                    answer_metrics=answer_metrics,
                    generated_at=datetime.utcnow() if generated_answer else None,
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
                        "result_id": str(result.id),
                        "query_id": str(result.query_id),
                        "query_text": query.query_text,
                        "chunks": result_chunks,
                        "score": result.score,
                        "latency_ms": result.latency_ms,
                        "metrics": result.metrics,
                        "evaluation_cost_usd": float(result.evaluation_cost_usd) if result.evaluation_cost_usd else None,
                        # Answer generation data
                        "generated_answer": result.generated_answer,
                        "generation_cost_usd": float(result.generation_cost_usd) if result.generation_cost_usd else None,
                        "answer_metrics": result.answer_metrics,
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

    async def get_document_context_for_result(
        self,
        result_id: UUID,
    ) -> DocumentContextResponse:
        """
        Get document with retrieved chunks highlighted.

        Shows the full document text with retrieved chunks marked,
        allowing users to see context around retrieved chunks.

        Args:
            result_id: Result UUID

        Returns:
            DocumentContextResponse with document and highlighted chunks

        Raises:
            ValueError: If result not found
        """
        # Get result
        result_query = select(Result).where(Result.id == result_id)
        result_result = await self.db.execute(result_query)
        result = result_result.scalar_one_or_none()

        if not result:
            raise ValueError(f"Result {result_id} not found")

        # Get query
        query_query = select(Query).where(Query.id == result.query_id)
        query_result = await self.db.execute(query_query)
        query = query_result.scalar_one_or_none()

        # Get config
        config_query = select(Config).where(Config.id == result.config_id)
        config_result = await self.db.execute(config_query)
        config = config_result.scalar_one_or_none()

        if not config:
            raise ValueError(f"Config {result.config_id} not found")

        # Get all retrieved chunks
        chunks_query = select(Chunk).where(Chunk.id.in_(result.retrieved_chunk_ids))
        chunks_result = await self.db.execute(chunks_query)
        retrieved_chunks = list(chunks_result.scalars().all())

        # Get document (from first chunk)
        if not retrieved_chunks:
            raise ValueError(f"No retrieved chunks found for result {result_id}")

        document_id = retrieved_chunks[0].document_id
        doc_query = select(Document).where(Document.id == document_id)
        doc_result = await self.db.execute(doc_query)
        document = doc_result.scalar_one_or_none()

        if not document:
            raise ValueError(f"Document {document_id} not found")

        # Get ALL chunks for this document+config (for context)
        all_chunks_query = (
            select(Chunk)
            .where(Chunk.document_id == document_id)
            .where(Chunk.config_id == config.id)
            .order_by(Chunk.chunk_index)
        )
        all_chunks_result = await self.db.execute(all_chunks_query)
        all_chunks = list(all_chunks_result.scalars().all())

        # Build retrieved chunk info with ranks
        retrieved_chunk_map = {chunk.id: chunk for chunk in retrieved_chunks}
        retrieved_chunk_infos = []

        for rank, chunk_id in enumerate(result.retrieved_chunk_ids, start=1):
            chunk = retrieved_chunk_map.get(chunk_id)
            if chunk:
                # Find chunk position in document
                chunk_start = document.content.find(chunk.content)
                chunk_end = chunk_start + len(chunk.content) if chunk_start != -1 else -1

                retrieved_chunk_infos.append(
                    RetrievedChunkInfo(
                        chunk_id=chunk.id,
                        chunk_index=chunk.chunk_index,
                        rank=rank,
                        score=result.score,  # Could be per-chunk score if available
                        start_pos=chunk_start if chunk_start != -1 else 0,
                        end_pos=chunk_end if chunk_end != -1 else len(chunk.content),
                        content=chunk.content,
                    )
                )

        # Build all chunks info (for dimmed display)
        all_chunks_info = []
        for chunk in all_chunks:
            chunk_start = document.content.find(chunk.content)
            chunk_end = chunk_start + len(chunk.content) if chunk_start != -1 else -1

            all_chunks_info.append({
                "chunk_id": str(chunk.id),
                "chunk_index": chunk.chunk_index,
                "start_pos": chunk_start if chunk_start != -1 else 0,
                "end_pos": chunk_end if chunk_end != -1 else len(chunk.content),
                "is_retrieved": chunk.id in result.retrieved_chunk_ids,
            })

        return DocumentContextResponse(
            document_id=document.id,
            document_filename=document.filename,
            full_text=document.content,
            config_id=config.id,
            config_name=config.name,
            query_id=query.id if query else None,
            query_text=query.query_text if query else None,
            retrieved_chunks=retrieved_chunk_infos,
            all_chunks=all_chunks_info,
            total_chunks=len(all_chunks),
            retrieved_count=len(retrieved_chunk_infos),
        )
