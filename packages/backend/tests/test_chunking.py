"""Tests for chunking service."""

import pytest
from app.core.chunking import ChunkingService


def test_chunk_fixed():
    """Test fixed-size chunking."""
    text = "This is a test. " * 100
    chunks = ChunkingService.chunk_fixed(text, chunk_size=50, chunk_overlap=10)

    assert len(chunks) > 0
    assert all(len(chunk) <= 60 for chunk in chunks)  # Allow for overlap


def test_chunk_fixed_small_text():
    """Test chunking with text smaller than chunk size."""
    text = "Short text"
    chunks = ChunkingService.chunk_fixed(text, chunk_size=100, chunk_overlap=10)

    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_recursive():
    """Test recursive chunking."""
    text = "Paragraph one.\n\nParagraph two.\n\nParagraph three."
    chunks = ChunkingService.chunk_recursive(text, chunk_size=20, chunk_overlap=5)

    assert len(chunks) > 0
    assert all(isinstance(chunk, str) for chunk in chunks)


def test_chunk_semantic_not_implemented():
    """Test that semantic chunking raises NotImplementedError."""
    with pytest.raises(NotImplementedError):
        ChunkingService.chunk_semantic("test text")


def test_chunk_text_with_strategy():
    """Test chunking with different strategies."""
    text = "Test text " * 20

    # Test fixed strategy
    chunks_fixed = ChunkingService.chunk_text(text, strategy="fixed", chunk_size=30)
    assert len(chunks_fixed) > 0

    # Test recursive strategy
    chunks_recursive = ChunkingService.chunk_text(
        text, strategy="recursive", chunk_size=30
    )
    assert len(chunks_recursive) > 0

    # Test unknown strategy
    with pytest.raises(ValueError):
        ChunkingService.chunk_text(text, strategy="unknown")
