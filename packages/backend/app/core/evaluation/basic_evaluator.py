"""Basic Information Retrieval metrics evaluator."""

from typing import List, Dict, Optional
import numpy as np
from uuid import UUID

from app.models.chunk import Chunk
from app.models.query import Query
from app.core.embedding import EmbeddingService


class BasicIREvaluator:
    """
    Evaluate retrieval using standard IR metrics (no API calls needed).

    All metrics are FREE and INSTANT - no external API costs.
    """

    async def evaluate(
        self,
        query: Query,
        retrieved_chunks: List[Chunk],
        embedding_service: Optional[EmbeddingService] = None,
        embedding_model: Optional[str] = None,
        ground_truth_chunk_ids: Optional[List[UUID]] = None,
        top_k: int = 5
    ) -> Dict[str, float]:
        """
        Calculate all basic IR metrics.

        Args:
            query: The query object
            retrieved_chunks: List of retrieved chunks (ordered by relevance)
            embedding_service: Optional embedding service for text-based ground truth
            ground_truth_chunk_ids: Optional list of ground truth chunk IDs (legacy)
            top_k: Number of top chunks to consider

        Returns:
            Dictionary of metric name -> score
        """
        metrics = {}

        # Limit to top_k
        chunks = retrieved_chunks[:top_k]
        retrieved_ids = [str(c.id) for c in chunks]

        # Determine ground truth chunk IDs
        gt_ids: Optional[List[str]] = None

        # Priority 1: Explicit chunk IDs (legacy/power user feature)
        if ground_truth_chunk_ids:
            gt_ids = [str(id) for id in ground_truth_chunk_ids]
        # Priority 2: Text-based ground truth via semantic matching
        elif query.ground_truth and query.ground_truth.strip() and embedding_service and embedding_model:
            gt_ids = await self._match_chunks_with_text_ground_truth(
                ground_truth_text=query.ground_truth,
                retrieved_chunks=chunks,
                embedding_service=embedding_service,
                embedding_model=embedding_model,
                threshold=0.75  # 75% similarity threshold
            )

        # Ground truth dependent metrics
        if gt_ids:
            metrics["mrr"] = self._calculate_mrr(retrieved_ids, gt_ids)
            metrics[f"ndcg@{top_k}"] = self._calculate_ndcg(retrieved_ids, gt_ids, top_k)
            metrics[f"precision@{top_k}"] = self._calculate_precision(retrieved_ids, gt_ids)
            metrics[f"recall@{top_k}"] = self._calculate_recall(retrieved_ids, gt_ids)
            metrics[f"f1@{top_k}"] = self._calculate_f1(
                metrics[f"precision@{top_k}"],
                metrics[f"recall@{top_k}"]
            )
            metrics[f"hit_rate@{top_k}"] = self._calculate_hit_rate(retrieved_ids, gt_ids)

        # Ground truth independent metrics
        metrics["diversity"] = self._calculate_diversity(chunks)
        metrics["avg_chunk_length"] = self._calculate_avg_length(chunks)

        return metrics

    async def _match_chunks_with_text_ground_truth(
        self,
        ground_truth_text: str,
        retrieved_chunks: List[Chunk],
        embedding_service: EmbeddingService,
        embedding_model: str,
        threshold: float = 0.75
    ) -> List[str]:
        """
        Match retrieved chunks to ground truth text via embedding similarity.

        Args:
            ground_truth_text: The expected answer text
            retrieved_chunks: List of retrieved chunks
            embedding_service: Service to generate embeddings
            embedding_model: Embedding model to use (must match chunk embeddings)
            threshold: Similarity threshold (0-1) for considering a chunk relevant

        Returns:
            List of chunk IDs that match the ground truth semantically
        """
        # Generate embedding for ground truth text using SAME model as chunks
        gt_embedding = await embedding_service.embed_single(
            text=ground_truth_text,
            model=embedding_model
        )

        relevant_chunk_ids = []

        for chunk in retrieved_chunks:
            if chunk.embedding is None:
                continue

            # Calculate cosine similarity
            similarity = self._cosine_similarity(gt_embedding, chunk.embedding)

            # If similarity exceeds threshold, consider it relevant
            if similarity >= threshold:
                relevant_chunk_ids.append(str(chunk.id))

        return relevant_chunk_ids

    def _calculate_mrr(self, retrieved: List[str], ground_truth: List[str]) -> float:
        """
        Mean Reciprocal Rank.

        MRR = 1 / rank of first relevant item

        Example:
        - First relevant item at position 2 -> MRR = 1/2 = 0.5
        - First relevant item at position 1 -> MRR = 1/1 = 1.0
        - No relevant items -> MRR = 0.0
        """
        for i, chunk_id in enumerate(retrieved):
            if chunk_id in ground_truth:
                return 1.0 / (i + 1)
        return 0.0

    def _calculate_ndcg(
        self,
        retrieved: List[str],
        ground_truth: List[str],
        k: int
    ) -> float:
        """
        Normalized Discounted Cumulative Gain at K.

        NDCG considers both relevance and position:
        - Items at top positions get higher weight
        - Normalized to [0, 1] range

        Formula:
        DCG = Σ (relevance_i / log2(i + 2))
        IDCG = DCG for perfect ranking
        NDCG = DCG / IDCG
        """
        if not ground_truth:
            return 0.0

        # Calculate DCG
        dcg = 0.0
        for i, chunk_id in enumerate(retrieved[:k]):
            relevance = 1.0 if chunk_id in ground_truth else 0.0
            dcg += relevance / np.log2(i + 2)  # i+2 because i starts at 0

        # Calculate IDCG (perfect ranking)
        idcg = 0.0
        for i in range(min(k, len(ground_truth))):
            idcg += 1.0 / np.log2(i + 2)

        return dcg / idcg if idcg > 0 else 0.0

    def _calculate_precision(self, retrieved: List[str], ground_truth: List[str]) -> float:
        """
        Precision at K.

        Precision = (# relevant items retrieved) / (# items retrieved)

        Example:
        - Retrieved 5 chunks, 4 are relevant -> P@5 = 4/5 = 0.8
        """
        if not retrieved:
            return 0.0

        relevant_retrieved = len(set(retrieved) & set(ground_truth))
        return relevant_retrieved / len(retrieved)

    def _calculate_recall(self, retrieved: List[str], ground_truth: List[str]) -> float:
        """
        Recall at K.

        Recall = (# relevant items retrieved) / (# relevant items total)

        Example:
        - 10 relevant chunks exist, retrieved 8 -> R@K = 8/10 = 0.8
        """
        if not ground_truth:
            return 0.0

        relevant_retrieved = len(set(retrieved) & set(ground_truth))
        return relevant_retrieved / len(ground_truth)

    def _calculate_f1(self, precision: float, recall: float) -> float:
        """
        F1 Score (harmonic mean of precision and recall).

        F1 = 2 * (P * R) / (P + R)

        Balances precision and recall into single metric.
        """
        if precision + recall == 0:
            return 0.0
        return 2 * (precision * recall) / (precision + recall)

    def _calculate_hit_rate(self, retrieved: List[str], ground_truth: List[str]) -> float:
        """
        Hit Rate at K (binary: did we get ANY relevant item?).

        Hit Rate = 1 if any relevant item in top K, else 0
        """
        return 1.0 if any(chunk_id in ground_truth for chunk_id in retrieved) else 0.0

    def _calculate_diversity(self, chunks: List[Chunk]) -> float:
        """
        Diversity score (how different are the retrieved chunks?).

        Calculates average pairwise cosine distance between chunks.
        Higher diversity = less redundant information.

        Range: [0, 1] where 1 = maximum diversity
        """
        if len(chunks) < 2:
            return 1.0

        # Calculate pairwise similarities
        similarities = []
        for i in range(len(chunks)):
            for j in range(i + 1, len(chunks)):
                if chunks[i].embedding is not None and chunks[j].embedding is not None:
                    sim = self._cosine_similarity(
                        chunks[i].embedding,
                        chunks[j].embedding
                    )
                    similarities.append(sim)

        if not similarities:
            return 1.0

        # Diversity = 1 - avg_similarity
        avg_similarity = sum(similarities) / len(similarities)
        return 1.0 - avg_similarity

    def _calculate_avg_length(self, chunks: List[Chunk]) -> float:
        """Average chunk length in characters."""
        if not chunks:
            return 0.0
        return sum(len(c.content) for c in chunks) / len(chunks)

    @staticmethod
    def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))
