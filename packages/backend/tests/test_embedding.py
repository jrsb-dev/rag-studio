"""Tests for embedding service."""

import pytest
import numpy as np
from app.core.embedding import EmbeddingService


def test_cosine_similarity():
    """Test cosine similarity calculation."""
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [1.0, 0.0, 0.0]

    similarity = EmbeddingService.cosine_similarity(vec_a, vec_b)
    assert similarity == pytest.approx(1.0)


def test_cosine_similarity_orthogonal():
    """Test cosine similarity with orthogonal vectors."""
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [0.0, 1.0, 0.0]

    similarity = EmbeddingService.cosine_similarity(vec_a, vec_b)
    assert similarity == pytest.approx(0.0)


def test_cosine_similarity_opposite():
    """Test cosine similarity with opposite vectors."""
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [-1.0, 0.0, 0.0]

    similarity = EmbeddingService.cosine_similarity(vec_a, vec_b)
    assert similarity == pytest.approx(-1.0)


@pytest.mark.skip(reason="Requires OpenAI API key")
async def test_embed_single():
    """Test single text embedding (requires API key)."""
    service = EmbeddingService()
    embedding = await service.embed_single("test text")

    assert isinstance(embedding, list)
    assert len(embedding) == 1536  # OpenAI ada-002 dimension


@pytest.mark.skip(reason="Requires OpenAI API key")
async def test_embed_batch():
    """Test batch text embedding (requires API key)."""
    service = EmbeddingService()
    texts = ["text one", "text two", "text three"]
    embeddings = await service.embed_batch(texts)

    assert len(embeddings) == 3
    assert all(len(emb) == 1536 for emb in embeddings)
