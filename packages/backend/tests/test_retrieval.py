"""Tests for retrieval service."""

import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.retrieval import RetrievalService
from app.models.chunk import Chunk
from app.models.config import Config
from app.models.document import Document
from app.models.project import Project


@pytest.fixture
async def test_project(db_session: AsyncSession) -> Project:
    """Create a test project."""
    project = Project(name="Test Project", description="Test")
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)
    return project


@pytest.fixture
async def test_document(db_session: AsyncSession, test_project: Project) -> Document:
    """Create a test document."""
    document = Document(
        project_id=test_project.id,
        filename="test.txt",
        content="Sample test content",
        file_type="text/plain",
        file_size=100,
    )
    db_session.add(document)
    await db_session.commit()
    await db_session.refresh(document)
    return document


@pytest.fixture
async def test_config(db_session: AsyncSession, test_project: Project) -> Config:
    """Create a test config."""
    config = Config(
        project_id=test_project.id,
        name="Test Config",
        chunk_strategy="fixed",
        chunk_size=512,
        chunk_overlap=50,
        embedding_model="text-embedding-ada-002",
        retrieval_strategy="dense",
        top_k=5,
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)
    return config


@pytest.fixture
async def test_chunks(
    db_session: AsyncSession,
    test_document: Document,
    test_config: Config,
) -> list[Chunk]:
    """Create test chunks with embeddings and content."""
    chunks = [
        Chunk(
            document_id=test_document.id,
            config_id=test_config.id,
            content="Machine learning is a subset of artificial intelligence",
            embedding=[0.1] * 1536,  # 1536-dim vector for ada-002
            chunk_index=0,
            chunk_metadata={"embedding_model": "text-embedding-ada-002", "embedding_dim": 1536},
        ),
        Chunk(
            document_id=test_document.id,
            config_id=test_config.id,
            content="Deep learning uses neural networks with multiple layers",
            embedding=[0.2] * 1536,
            chunk_index=1,
            chunk_metadata={"embedding_model": "text-embedding-ada-002", "embedding_dim": 1536},
        ),
        Chunk(
            document_id=test_document.id,
            config_id=test_config.id,
            content="Natural language processing helps computers understand text",
            embedding=[0.3] * 1536,
            chunk_index=2,
            chunk_metadata={"embedding_model": "text-embedding-ada-002", "embedding_dim": 1536},
        ),
    ]

    for chunk in chunks:
        db_session.add(chunk)

    await db_session.commit()

    for chunk in chunks:
        await db_session.refresh(chunk)

    return chunks


@pytest.mark.asyncio
async def test_search_dense(
    db_session: AsyncSession,
    test_config: Config,
    test_chunks: list[Chunk],
):
    """Test dense vector search."""
    retrieval_service = RetrievalService(db_session)

    # Search with a query embedding
    query_embedding = [0.15] * 1536
    results = await retrieval_service.search_dense(
        query_embedding=query_embedding,
        config_id=test_config.id,
        top_k=2,
    )

    assert len(results) == 2
    assert all(isinstance(chunk, Chunk) for chunk in results)


@pytest.mark.asyncio
async def test_search_bm25(
    db_session: AsyncSession,
    test_config: Config,
    test_chunks: list[Chunk],
):
    """Test BM25 full-text search."""
    retrieval_service = RetrievalService(db_session)

    # Search for chunks containing specific keywords
    results = await retrieval_service.search_bm25(
        query_text="neural networks deep learning",
        config_id=test_config.id,
        top_k=2,
    )

    # Should find the chunk about deep learning
    assert len(results) >= 1
    assert any("neural networks" in chunk.content for chunk in results)


@pytest.mark.asyncio
async def test_search_bm25_no_results(
    db_session: AsyncSession,
    test_config: Config,
    test_chunks: list[Chunk],
):
    """Test BM25 search with query that matches nothing."""
    retrieval_service = RetrievalService(db_session)

    # Search for something that doesn't exist
    results = await retrieval_service.search_bm25(
        query_text="quantum computing blockchain cryptocurrency",
        config_id=test_config.id,
        top_k=5,
    )

    # Should return empty list (no chunks match)
    assert len(results) == 0


@pytest.mark.asyncio
async def test_search_hybrid(
    db_session: AsyncSession,
    test_config: Config,
    test_chunks: list[Chunk],
):
    """Test hybrid search (dense + BM25)."""
    retrieval_service = RetrievalService(db_session)

    query_embedding = [0.15] * 1536
    query_text = "machine learning artificial intelligence"

    results = await retrieval_service.search_hybrid(
        query_embedding=query_embedding,
        query_text=query_text,
        config_id=test_config.id,
        top_k=2,
    )

    assert len(results) <= 2
    assert all(isinstance(chunk, Chunk) for chunk in results)


@pytest.mark.asyncio
async def test_search_dense_dimension_mismatch(
    db_session: AsyncSession,
    test_config: Config,
    test_chunks: list[Chunk],
):
    """Test that dimension mismatch raises an error."""
    retrieval_service = RetrievalService(db_session)

    # Try to search with wrong dimension
    query_embedding = [0.1] * 3072  # Wrong dimension

    with pytest.raises(ValueError, match="Embedding model mismatch"):
        await retrieval_service.search_dense(
            query_embedding=query_embedding,
            config_id=test_config.id,
            top_k=5,
        )


@pytest.mark.asyncio
async def test_search_dense_no_chunks(
    db_session: AsyncSession,
):
    """Test search with non-existent config."""
    retrieval_service = RetrievalService(db_session)

    fake_config_id = uuid4()
    query_embedding = [0.1] * 1536

    with pytest.raises(ValueError, match="No chunks found"):
        await retrieval_service.search_dense(
            query_embedding=query_embedding,
            config_id=fake_config_id,
            top_k=5,
        )