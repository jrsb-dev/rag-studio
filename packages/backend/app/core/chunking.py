"""Chunking service for document processing."""

from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter


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
    def chunk_semantic(text: str) -> List[str]:
        """
        Semantic chunking (future implementation).

        Args:
            text: Text to chunk

        Returns:
            List of text chunks

        Raises:
            NotImplementedError: This feature is not yet implemented
        """
        raise NotImplementedError("Semantic chunking not yet implemented")

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
            return cls.chunk_semantic(text)
        else:
            raise ValueError(f"Unknown chunking strategy: {strategy}")
