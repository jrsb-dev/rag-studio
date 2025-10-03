"""Embedding service for generating vector embeddings."""

from typing import List
import numpy as np
from openai import AsyncOpenAI

from app.config import settings


# Embedding model registry with dimensions
EMBEDDING_MODELS = {
    "text-embedding-ada-002": {
        "dimensions": 1536,
        "provider": "openai",
        "description": "OpenAI Ada-002 (legacy, cost-effective)",
    },
    "text-embedding-3-small": {
        "dimensions": 1536,
        "provider": "openai",
        "description": "OpenAI Embedding v3 Small (fast, efficient)",
    },
    "text-embedding-3-large": {
        "dimensions": 3072,
        "provider": "openai",
        "description": "OpenAI Embedding v3 Large (highest quality)",
    },
}


def get_model_dimensions(model: str) -> int:
    """
    Get embedding dimensions for a model.

    Args:
        model: Embedding model name

    Returns:
        Number of dimensions for the model

    Raises:
        ValueError: If model is not supported
    """
    if model not in EMBEDDING_MODELS:
        raise ValueError(
            f"Unsupported embedding model: {model}. "
            f"Supported models: {', '.join(EMBEDDING_MODELS.keys())}"
        )
    return EMBEDDING_MODELS[model]["dimensions"]


class EmbeddingService:
    """Service for generating embeddings for text chunks."""

    def __init__(self, api_key: str | None = None):
        """
        Initialize embedding service.

        Args:
            api_key: OpenAI API key (uses settings if not provided)
        """
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.client = AsyncOpenAI(api_key=self.api_key)

    async def embed_batch(
        self,
        texts: List[str],
        model: str = "text-embedding-ada-002",
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed
            model: Embedding model to use

        Returns:
            List of embedding vectors

        Raises:
            ValueError: If model is not supported
        """
        # Validate model before making API call
        expected_dim = get_model_dimensions(model)

        response = await self.client.embeddings.create(
            model=model,
            input=texts,
        )

        embeddings = [item.embedding for item in response.data]

        # Verify dimensions match expected (sanity check)
        if embeddings and len(embeddings[0]) != expected_dim:
            raise ValueError(
                f"Model {model} returned {len(embeddings[0])} dimensions, "
                f"expected {expected_dim}"
            )

        return embeddings

    async def embed_single(
        self,
        text: str,
        model: str = "text-embedding-ada-002",
    ) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed
            model: Embedding model to use

        Returns:
            Embedding vector
        """
        embeddings = await self.embed_batch([text], model)
        return embeddings[0]

    @staticmethod
    def cosine_similarity(a: List[float], b: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.

        Args:
            a: First vector
            b: Second vector

        Returns:
            Cosine similarity score
        """
        a_array = np.array(a)
        b_array = np.array(b)
        return float(np.dot(a_array, b_array) / (np.linalg.norm(a_array) * np.linalg.norm(b_array)))
