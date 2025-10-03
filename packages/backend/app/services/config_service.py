"""Config service for business logic."""

from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.config import Config
from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.config import ConfigCreate, ConfigUpdate
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
