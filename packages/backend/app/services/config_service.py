"""Config service for business logic."""

from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.config import Config
from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.config import ConfigCreate, ConfigUpdate
from app.schemas.chunk_visualization import (
    ChunkVisualizationResponse,
    ChunkBoundary,
    OverlapRegion,
    ChunkStatistics,
)
from app.schemas.similarity import SimilarityMatrixResponse
from app.core.chunking import ChunkingService
from app.core.embedding import EmbeddingService, get_model_dimensions


class ConfigService:
    """Service for config-related operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def create_config(self, project_id: UUID, config_data: ConfigCreate) -> Config:
        """Create a new configuration and process chunks."""
        # Create config
        config = Config(
            project_id=project_id,
            **config_data.model_dump(),
        )

        self.db.add(config)
        await self.db.commit()
        await self.db.refresh(config)

        # Process documents and create chunks (background task in production)
        await self._process_config(config)

        return config

    async def _process_config(self, config: Config) -> None:
        """Process documents and create chunks for a config."""
        # Get all documents for this project
        query = select(Document).where(Document.project_id == config.project_id)
        result = await self.db.execute(query)
        documents = result.scalars().all()

        # Get OpenAI API key from settings
        from app.services.settings_service import SettingsService
        settings_service = SettingsService(self.db)
        api_key = await settings_service.get_openai_key()

        if not api_key:
            raise ValueError(
                "OpenAI API key not configured. Please set it in Settings."
            )

        # Initialize services
        chunking_service = ChunkingService()
        embedding_service = EmbeddingService(api_key=api_key)

        # Get embedding dimensions for this model
        embedding_dim = get_model_dimensions(config.embedding_model)

        # Check if we need embeddings (not needed for BM25-only)
        needs_embeddings = config.retrieval_strategy in ("dense", "hybrid")

        # Process each document
        for document in documents:
            # Chunk document
            chunks = chunking_service.chunk_text(
                text=document.content,
                strategy=config.chunk_strategy,
                chunk_size=config.chunk_size or 512,
                chunk_overlap=config.chunk_overlap or 50,
            )

            # Generate embeddings only if needed
            if needs_embeddings:
                embeddings = await embedding_service.embed_batch(
                    texts=chunks,
                    model=config.embedding_model,
                )
            else:
                # BM25-only: no embeddings needed
                embeddings = [None] * len(chunks)

            # Create chunk records with metadata including dimensions
            for idx, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
                chunk_meta = {
                    "strategy": config.chunk_strategy,
                }

                # Only add embedding metadata if we have embeddings
                if needs_embeddings:
                    chunk_meta["embedding_model"] = config.embedding_model
                    chunk_meta["embedding_dim"] = embedding_dim

                chunk = Chunk(
                    document_id=document.id,
                    config_id=config.id,
                    content=chunk_text,
                    embedding=embedding,
                    chunk_index=idx,
                    chunk_metadata=chunk_meta,
                )
                self.db.add(chunk)

        await self.db.commit()

    async def get_config(self, config_id: UUID) -> Config | None:
        """Get config by ID with chunk count."""
        query = select(Config).where(Config.id == config_id)
        result = await self.db.execute(query)
        config = result.scalar_one_or_none()

        if config:
            # Get chunk count
            chunk_count_query = select(func.count()).select_from(Chunk).where(
                Chunk.config_id == config_id
            )
            chunk_count = await self.db.scalar(chunk_count_query)
            config.chunk_count = chunk_count
            config.status = "ready" if chunk_count > 0 else "pending"

        return config

    async def list_configs(self, project_id: UUID) -> list[Config]:
        """List configurations for a project."""
        query = (
            select(Config)
            .where(Config.project_id == project_id)
            .order_by(Config.created_at.desc())
        )
        result = await self.db.execute(query)
        configs = list(result.scalars().all())

        # Add chunk counts and status
        for config in configs:
            chunk_count_query = select(func.count()).select_from(Chunk).where(
                Chunk.config_id == config.id
            )
            chunk_count = await self.db.scalar(chunk_count_query)
            config.chunk_count = chunk_count
            config.status = "ready" if chunk_count > 0 else "pending"

        return configs

    async def update_config(self, config_id: UUID, config_data: ConfigUpdate) -> Config | None:
        """Update configuration (limited fields)."""
        config = await self.get_config(config_id)
        if not config:
            return None

        update_data = config_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(config, key, value)

        await self.db.commit()
        await self.db.refresh(config)
        return config

    async def delete_config(self, config_id: UUID) -> bool:
        """Delete configuration and all related data."""
        from app.models.chunk import Chunk
        from app.models.result import Result

        config = await self.get_config(config_id)
        if not config:
            return False

        # Delete all results that reference this config
        results_query = select(Result).where(Result.config_id == config_id)
        results_result = await self.db.execute(results_query)
        results = results_result.scalars().all()
        for result in results:
            await self.db.delete(result)

        # Delete all chunks for this config
        chunks_query = select(Chunk).where(Chunk.config_id == config_id)
        chunks_result = await self.db.execute(chunks_query)
        chunks = chunks_result.scalars().all()
        for chunk in chunks:
            await self.db.delete(chunk)

        # Delete the config itself
        await self.db.delete(config)
        await self.db.commit()
        return True

    async def build_chunk_visualization(
        self,
        config_id: UUID,
        document_id: UUID,
    ) -> ChunkVisualizationResponse:
        """
        Build chunk visualization for a specific document and config.

        This method:
        1. Gets all chunks for the config+document
        2. Finds each chunk's position in the original document text
        3. Detects overlaps between consecutive chunks
        4. Calculates statistics

        Args:
            config_id: Config UUID
            document_id: Document UUID

        Returns:
            ChunkVisualizationResponse with complete visualization data

        Raises:
            ValueError: If config or document not found
        """
        # Get config
        config = await self.get_config(config_id)
        if not config:
            raise ValueError(f"Config {config_id} not found")

        # Get document
        doc_query = select(Document).where(Document.id == document_id)
        doc_result = await self.db.execute(doc_query)
        document = doc_result.scalar_one_or_none()
        if not document:
            raise ValueError(f"Document {document_id} not found")

        # Get all chunks for this config+document, ordered by chunk_index
        chunks_query = (
            select(Chunk)
            .where(Chunk.config_id == config_id)
            .where(Chunk.document_id == document_id)
            .order_by(Chunk.chunk_index)
        )
        chunks_result = await self.db.execute(chunks_query)
        chunks = list(chunks_result.scalars().all())

        if not chunks:
            raise ValueError(
                f"No chunks found for config {config_id} and document {document_id}"
            )

        # Find chunk positions in document text
        full_text = document.content
        chunk_boundaries: list[ChunkBoundary] = []
        overlap_regions: list[OverlapRegion] = []

        current_pos = 0
        for chunk in chunks:
            # Find chunk position in document (simple string search)
            # In production, you might want fuzzy matching if text was modified
            chunk_start = full_text.find(chunk.content, current_pos)

            if chunk_start == -1:
                # Fallback: try from beginning
                chunk_start = full_text.find(chunk.content)

            if chunk_start == -1:
                # Chunk not found - this shouldn't happen but handle gracefully
                chunk_start = current_pos
                chunk_end = current_pos + len(chunk.content)
            else:
                chunk_end = chunk_start + len(chunk.content)

            # Create chunk boundary
            boundary = ChunkBoundary(
                chunk_id=chunk.id,
                start_pos=chunk_start,
                end_pos=chunk_end,
                chunk_index=chunk.chunk_index,
                content_preview=chunk.content[:100],
                token_count=chunk.chunk_metadata.get("token_count", len(chunk.content) // 4),
                metadata=chunk.chunk_metadata or {},
            )
            chunk_boundaries.append(boundary)

            # Detect overlap with previous chunk
            if len(chunk_boundaries) > 1:
                prev_boundary = chunk_boundaries[-2]
                if chunk_start < prev_boundary.end_pos:
                    # Overlap detected
                    overlap_start = chunk_start
                    overlap_end = prev_boundary.end_pos
                    overlap_text = full_text[overlap_start:overlap_end]

                    overlap = OverlapRegion(
                        chunk_a_id=prev_boundary.chunk_id,
                        chunk_b_id=boundary.chunk_id,
                        start_pos=overlap_start,
                        end_pos=overlap_end,
                        overlap_text=overlap_text,
                    )
                    overlap_regions.append(overlap)

            # Update position for next search
            current_pos = chunk_end

        # Calculate statistics
        chunk_sizes = [b.end_pos - b.start_pos for b in chunk_boundaries]
        overlap_sizes = [o.end_pos - o.start_pos for o in overlap_regions]

        statistics = ChunkStatistics(
            total_chunks=len(chunk_boundaries),
            avg_chunk_size=sum(chunk_sizes) / len(chunk_sizes) if chunk_sizes else 0,
            min_chunk_size=min(chunk_sizes) if chunk_sizes else 0,
            max_chunk_size=max(chunk_sizes) if chunk_sizes else 0,
            total_overlap_chars=sum(overlap_sizes),
            avg_overlap_size=sum(overlap_sizes) / len(overlap_sizes) if overlap_sizes else 0,
            coverage=(
                (sum(chunk_sizes) - sum(overlap_sizes)) / len(full_text) * 100
                if full_text
                else 0
            ),
        )

        return ChunkVisualizationResponse(
            document_id=document.id,
            document_filename=document.filename,
            config_id=config.id,
            config_name=config.name,
            full_text=full_text,
            total_length=len(full_text),
            chunks=chunk_boundaries,
            overlaps=overlap_regions,
            statistics=statistics,
            chunk_strategy=config.chunk_strategy,
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap,
        )

    async def build_similarity_matrix(
        self,
        config_id: UUID,
        document_id: UUID,
    ) -> SimilarityMatrixResponse:
        """
        Build similarity matrix for chunks in a document.

        Calculates cosine similarity between all pairs of chunks
        using their embeddings.

        Args:
            config_id: Config UUID
            document_id: Document UUID

        Returns:
            SimilarityMatrixResponse with NxN similarity matrix

        Raises:
            ValueError: If config/document not found or chunks have no embeddings
        """
        # Get config
        config = await self.get_config(config_id)
        if not config:
            raise ValueError(f"Config {config_id} not found")

        # Get all chunks for this config+document, ordered by chunk_index
        chunks_query = (
            select(Chunk)
            .where(Chunk.config_id == config_id)
            .where(Chunk.document_id == document_id)
            .order_by(Chunk.chunk_index)
        )
        chunks_result = await self.db.execute(chunks_query)
        chunks = list(chunks_result.scalars().all())

        if not chunks:
            raise ValueError(
                f"No chunks found for config {config_id} and document {document_id}"
            )

        # Check if chunks have embeddings
        if chunks[0].embedding is None or len(chunks[0].embedding) == 0:
            raise ValueError(
                f"Chunks for config {config_id} have no embeddings. "
                "Similarity matrix requires dense embeddings."
            )

        # Calculate similarity matrix
        import numpy as np

        n = len(chunks)
        similarity_matrix = [[0.0 for _ in range(n)] for _ in range(n)]
        all_similarities = []

        for i, chunk_a in enumerate(chunks):
            for j, chunk_b in enumerate(chunks):
                if i == j:
                    # Self-similarity is always 1.0
                    similarity_matrix[i][j] = 1.0
                else:
                    # Calculate cosine similarity
                    embedding_a = np.array(chunk_a.embedding)
                    embedding_b = np.array(chunk_b.embedding)

                    similarity = float(
                        np.dot(embedding_a, embedding_b)
                        / (np.linalg.norm(embedding_a) * np.linalg.norm(embedding_b))
                    )
                    similarity_matrix[i][j] = similarity
                    all_similarities.append(similarity)

        # Calculate statistics
        avg_similarity = sum(all_similarities) / len(all_similarities) if all_similarities else 0.0
        min_similarity = min(all_similarities) if all_similarities else 0.0
        max_similarity = max(all_similarities) if all_similarities else 0.0

        # Find discontinuities (adjacent chunks with low similarity)
        discontinuity_threshold = 0.5  # Configurable
        discontinuities = []

        for i in range(len(chunks) - 1):
            similarity = similarity_matrix[i][i + 1]
            if similarity < discontinuity_threshold:
                discontinuities.append({
                    "chunk_a_index": i,
                    "chunk_b_index": i + 1,
                    "chunk_a_id": str(chunks[i].id),
                    "chunk_b_id": str(chunks[i + 1].id),
                    "similarity": similarity,
                    "severity": "high" if similarity < 0.3 else "medium",
                })

        return SimilarityMatrixResponse(
            document_id=document_id,
            config_id=config_id,
            chunk_ids=[chunk.id for chunk in chunks],
            similarity_matrix=similarity_matrix,
            avg_similarity=avg_similarity,
            min_similarity=min_similarity,
            max_similarity=max_similarity,
            discontinuities=discontinuities,
        )
