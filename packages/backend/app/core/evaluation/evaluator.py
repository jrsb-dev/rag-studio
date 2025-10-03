"""Unified evaluation service that orchestrates all evaluators."""

from typing import List, Dict, Any, Optional
from uuid import UUID

from app.models.chunk import Chunk
from app.models.query import Query
from app.models.config import Config
from app.core.evaluation.basic_evaluator import BasicIREvaluator
from app.core.evaluation.llm_evaluator import LLMJudgeEvaluator
from app.core.embedding import EmbeddingService


class EvaluationService:
    """Orchestrates all evaluation methods."""

    def __init__(self, openai_api_key: Optional[str] = None):
        """Initialize evaluation service."""
        self.basic_evaluator = BasicIREvaluator()

        if openai_api_key:
            self.llm_evaluator = LLMJudgeEvaluator(api_key=openai_api_key)
            self.embedding_service = EmbeddingService(api_key=openai_api_key)
        else:
            self.llm_evaluator = None
            self.embedding_service = None

    async def evaluate_retrieval(
        self,
        query: Query,
        retrieved_chunks: List[Chunk],
        config: Config,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Run complete evaluation pipeline.

        Args:
            query: Query object
            retrieved_chunks: Retrieved chunks
            config: Config with evaluation settings
            top_k: Number of top chunks to evaluate

        Returns:
            Complete evaluation results with all metrics
        """
        all_metrics = {}
        total_cost = 0.0

        # PHASE 1: Basic IR metrics (always run, free)
        basic_metrics = await self.basic_evaluator.evaluate(
            query=query,
            retrieved_chunks=retrieved_chunks,
            embedding_service=self.embedding_service,
            embedding_model=config.embedding_model,
            ground_truth_chunk_ids=query.ground_truth_chunk_ids,
            top_k=top_k
        )
        all_metrics["basic"] = basic_metrics

        # PHASE 2: LLM Judge (optional, costs money)
        eval_settings = config.evaluation_settings or {}

        if eval_settings.get("use_llm_judge") and self.llm_evaluator:
            llm_model = eval_settings.get("llm_judge_model", "gpt-3.5-turbo")

            llm_metrics = await self.llm_evaluator.evaluate(
                query_text=query.query_text,
                chunks=retrieved_chunks,
                model=llm_model,
                top_k=top_k
            )

            all_metrics["llm_judge"] = llm_metrics
            total_cost += llm_metrics.get("llm_eval_cost_usd", 0)

        # PHASE 3: RAGAS (optional, advanced) - TODO
        if eval_settings.get("use_ragas"):
            # Future implementation
            pass

        return {
            "metrics": all_metrics,
            "total_cost_usd": round(total_cost, 4),
            "top_k": top_k
        }

    @staticmethod
    def get_primary_score(metrics: Dict[str, Any]) -> float:
        """
        Get single primary score for ranking configs.

        Priority:
        1. RAGAS composite (if available)
        2. LLM judge avg (if available)
        3. NDCG@5 (if ground truth available)
        4. Diversity score (fallback)
        """
        # Try RAGAS composite
        if "ragas" in metrics:
            ragas = metrics["ragas"]
            if "ragas_context_precision" in ragas and "ragas_context_recall" in ragas:
                # F1 of precision and recall
                p = ragas["ragas_context_precision"]
                r = ragas["ragas_context_recall"]
                if p + r > 0:
                    return 2 * (p * r) / (p + r)

        # Try LLM judge
        if "llm_judge" in metrics:
            llm = metrics["llm_judge"]
            if "llm_avg_score" in llm:
                # Normalize to 0-1 range (LLM score is 1-5)
                return (llm["llm_avg_score"] - 1) / 4

        # Try NDCG
        if "basic" in metrics:
            basic = metrics["basic"]
            for key in ["ndcg@5", "ndcg@3", "ndcg@10"]:
                if key in basic:
                    return basic[key]

            # Try F1
            for key in ["f1@5", "f1@3", "f1@10"]:
                if key in basic:
                    return basic[key]

        # Fallback to diversity
        if "basic" in metrics and "diversity" in metrics["basic"]:
            return metrics["basic"]["diversity"]

        return 0.0
