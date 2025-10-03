"""Chunking service for document processing."""

from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter, CharacterTextSplitter


class ChunkingService:
    """Service for chunking documents with different strategies."""

    @staticmethod
    def chunk_fixed(
        text: str,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ) -> List[str]:
        """
        Fixed-size chunking with overlap.

        Args:
            text: Text to chunk
            chunk_size: Size of each chunk in characters
            chunk_overlap: Overlap between chunks

        Returns:
            List of text chunks
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            length_function=len,
        )
        return splitter.split_text(text)

    @staticmethod
    def chunk_recursive(
        text: str,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ) -> List[str]:
        """
        Recursive chunking (alias for fixed for now).

        Args:
            text: Text to chunk
            chunk_size: Size of each chunk
            chunk_overlap: Overlap between chunks

        Returns:
            List of text chunks
        """
        return ChunkingService.chunk_fixed(text, chunk_size, chunk_overlap)

    @staticmethod
    def chunk_semantic(
        text: str,
        chunk_size: int = 1024,
        chunk_overlap: int = 100,
    ) -> List[str]:
        """
        Semantic chunking based on sentence boundaries with token-aware splitting.

        Uses natural language boundaries (sentences, paragraphs) rather than
        fixed character counts for more semantically coherent chunks. Uses
        tiktoken for accurate token counting.

        Args:
            text: Text to chunk
            chunk_size: Approximate size of each chunk in tokens
            chunk_overlap: Overlap between chunks in tokens

        Returns:
            List of text chunks
        """
        # Use tiktoken-based splitting for accurate token counting
        # Try paragraph boundaries first
        splitter = CharacterTextSplitter.from_tiktoken_encoder(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separator="\n\n",  # Prefer paragraph boundaries
        )
        chunks = splitter.split_text(text)

        # If no paragraph splits worked, try sentence-level
        if len(chunks) <= 1 and len(text) > chunk_size * 2:  # Rough char estimate
            splitter = CharacterTextSplitter.from_tiktoken_encoder(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separator=". ",  # Fall back to sentence boundaries
            )
            chunks = splitter.split_text(text)

        return chunks

    @classmethod
    def chunk_text(
        cls,
        text: str,
        strategy: str = "fixed",
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ) -> List[str]:
        """
        Chunk text using specified strategy.

        Args:
            text: Text to chunk
            strategy: Chunking strategy ('fixed', 'recursive', 'semantic')
            chunk_size: Size of each chunk
            chunk_overlap: Overlap between chunks

        Returns:
            List of text chunks

        Raises:
            ValueError: If strategy is unknown
        """
        if strategy == "fixed":
            return cls.chunk_fixed(text, chunk_size, chunk_overlap)
        elif strategy == "recursive":
            return cls.chunk_recursive(text, chunk_size, chunk_overlap)
        elif strategy == "semantic":
            return cls.chunk_semantic(text, chunk_size, chunk_overlap)
        else:
            raise ValueError(f"Unknown chunking strategy: {strategy}")
