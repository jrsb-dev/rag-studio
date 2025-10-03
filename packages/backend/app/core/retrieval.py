"""Retrieval service for vector similarity search."""

from typing import List
from uuid import UUID
from sqlalchemy import select, cast, Integer
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

    async def search_hybrid(
        self,
        query_embedding: List[float],
        query_text: str,
        config_id: UUID,
        top_k: int = 5,
    ) -> List[Chunk]:
        """
        Hybrid search combining dense and sparse retrieval (future).

        Args:
            query_embedding: Query embedding vector
            query_text: Query text for sparse search
            config_id: Configuration ID to filter chunks
            top_k: Number of results to return

        Returns:
            List of most similar chunks

        Raises:
            NotImplementedError: This feature is not yet implemented
        """
        raise NotImplementedError("Hybrid search not yet implemented")

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
