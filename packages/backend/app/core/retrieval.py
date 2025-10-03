"""Retrieval service for vector similarity search."""

from typing import List, Dict
from uuid import UUID
from sqlalchemy import select, cast, Integer, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk


class RetrievalService:
    """Service for retrieving relevant chunks using vector similarity."""

    def __init__(self, db: AsyncSession):
        """
        Initialize retrieval service.

        Args:
            db: Database session
        """
        self.db = db

    async def search_dense(
        self,
        query_embedding: List[float],
        config_id: UUID,
        top_k: int = 5,
    ) -> List[Chunk]:
        """
        Search for similar chunks using dense vector similarity (cosine).

        Ensures dimension safety by only comparing vectors of the same dimension.

        Args:
            query_embedding: Query embedding vector
            config_id: Configuration ID to filter chunks
            top_k: Number of results to return

        Returns:
            List of most similar chunks

        Raises:
            ValueError: If no chunks found for the config or dimension mismatch
        """
        query_dim = len(query_embedding)

        # Build query with dimension validation
        # Filter by config_id AND embedding_dim to ensure dimension safety
        query = (
            select(Chunk)
            .where(Chunk.config_id == config_id)
            .where(
                cast(Chunk.chunk_metadata["embedding_dim"].astext, Integer) == query_dim
            )
            .order_by(Chunk.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        )

        result = await self.db.execute(query)
        chunks = list(result.scalars().all())

        if not chunks:
            # Check if there are any chunks for this config at all
            count_query = select(Chunk).where(Chunk.config_id == config_id).limit(1)
            count_result = await self.db.execute(count_query)
            if not count_result.scalar_one_or_none():
                raise ValueError(f"No chunks found for config {config_id}")
            else:
                raise ValueError(
                    f"No chunks with {query_dim} dimensions found for config {config_id}. "
                    "Embedding model mismatch detected."
                )

        return chunks

    async def search_bm25(
        self,
        query_text: str,
        config_id: UUID,
        top_k: int = 5,
    ) -> List[Chunk]:
        """
        Search for similar chunks using BM25 (full-text search).

        Uses PostgreSQL's full-text search with ts_rank_cd for BM25-like ranking.

        Args:
            query_text: Query text for keyword search
            config_id: Configuration ID to filter chunks
            top_k: Number of results to return

        Returns:
            List of most relevant chunks

        Raises:
            ValueError: If no chunks found for the config
        """
        # Convert query to tsquery
        query = (
            select(Chunk)
            .where(Chunk.config_id == config_id)
            .where(Chunk.content_tsv.op('@@')(func.plainto_tsquery('english', query_text)))
            .order_by(
                func.ts_rank_cd(
                    Chunk.content_tsv,
                    func.plainto_tsquery('english', query_text)
                ).desc()
            )
            .limit(top_k)
        )

        result = await self.db.execute(query)
        chunks = list(result.scalars().all())

        if not chunks:
            # Check if there are any chunks for this config at all
            count_query = select(Chunk).where(Chunk.config_id == config_id).limit(1)
            count_result = await self.db.execute(count_query)
            if not count_result.scalar_one_or_none():
                raise ValueError(f"No chunks found for config {config_id}")
            else:
                # Chunks exist but query didn't match anything
                # Return empty list (different from dense which requires matches)
                # This is expected behavior for keyword search
                pass

        return chunks

    async def search_hybrid(
        self,
        query_embedding: List[float],
        query_text: str,
        config_id: UUID,
        top_k: int = 5,
        dense_weight: float = 0.5,
        sparse_weight: float = 0.5,
    ) -> List[Chunk]:
        """
        Hybrid search combining dense (vector) and sparse (BM25) retrieval.

        Uses Reciprocal Rank Fusion (RRF) to combine results from both methods.

        Args:
            query_embedding: Query embedding vector
            query_text: Query text for sparse search
            config_id: Configuration ID to filter chunks
            top_k: Number of results to return
            dense_weight: Weight for dense retrieval (default 0.5)
            sparse_weight: Weight for sparse retrieval (default 0.5)

        Returns:
            List of most similar chunks (re-ranked using RRF)

        Raises:
            ValueError: If no chunks found for the config
        """
        # Get more results from each method for better fusion
        fusion_k = top_k * 3

        # Get dense results
        try:
            dense_chunks = await self.search_dense(query_embedding, config_id, fusion_k)
        except ValueError:
            dense_chunks = []

        # Get sparse results
        try:
            sparse_chunks = await self.search_bm25(query_text, config_id, fusion_k)
        except ValueError:
            sparse_chunks = []

        if not dense_chunks and not sparse_chunks:
            raise ValueError(f"No chunks found for config {config_id}")

        # If only one method returned results, use that
        if not dense_chunks:
            return sparse_chunks[:top_k]
        if not sparse_chunks:
            return dense_chunks[:top_k]

        # Apply Reciprocal Rank Fusion (RRF)
        # RRF score = sum(weight / (k + rank)) for each method
        rrf_k = 60  # Standard RRF constant
        chunk_scores: Dict[UUID, float] = {}
        chunk_map: Dict[UUID, Chunk] = {}

        # Score dense results
        for rank, chunk in enumerate(dense_chunks, start=1):
            chunk_id = chunk.id
            chunk_scores[chunk_id] = chunk_scores.get(chunk_id, 0) + dense_weight / (rrf_k + rank)
            chunk_map[chunk_id] = chunk

        # Score sparse results
        for rank, chunk in enumerate(sparse_chunks, start=1):
            chunk_id = chunk.id
            chunk_scores[chunk_id] = chunk_scores.get(chunk_id, 0) + sparse_weight / (rrf_k + rank)
            chunk_map[chunk_id] = chunk

        # Sort by RRF score and return top-k
        sorted_chunk_ids = sorted(chunk_scores.keys(), key=lambda x: chunk_scores[x], reverse=True)
        return [chunk_map[chunk_id] for chunk_id in sorted_chunk_ids[:top_k]]

    async def calculate_score(
        self,
        query_embedding: List[float],
        chunk_embedding: List[float],
    ) -> float:
        """
        Calculate similarity score between query and chunk.

        Args:
            query_embedding: Query embedding vector
            chunk_embedding: Chunk embedding vector

        Returns:
            Similarity score (cosine similarity)
        """
        import numpy as np

        query_array = np.array(query_embedding)
        chunk_array = np.array(chunk_embedding)

        # Cosine similarity
        similarity = float(
            np.dot(query_array, chunk_array)
            / (np.linalg.norm(query_array) * np.linalg.norm(chunk_array))
        )

        return similarity
