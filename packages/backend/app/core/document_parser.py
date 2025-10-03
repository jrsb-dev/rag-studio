"""Document parser for extracting text from various file formats."""

import io
from typing import Dict, Any
from pypdf import PdfReader


class DocumentParser:
    """Service for parsing documents and extracting text."""

    @staticmethod
    def parse_pdf(file_content: bytes) -> Dict[str, Any]:
        """
        Parse PDF file and extract text.

        Args:
            file_content: PDF file content as bytes

        Returns:
            Dictionary with extracted text and metadata
        """
        pdf_file = io.BytesIO(file_content)
        reader = PdfReader(pdf_file)

        # Extract text from all pages
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n\n"

        # Get metadata
        metadata = {
            "num_pages": len(reader.pages),
            "metadata": reader.metadata if reader.metadata else {},
        }

        return {
            "text": text.strip(),
            "metadata": metadata,
        }

    @staticmethod
    def parse_txt(file_content: bytes) -> Dict[str, Any]:
        """
        Parse text file.

        Args:
            file_content: Text file content as bytes

        Returns:
            Dictionary with extracted text and metadata
        """
        text = file_content.decode("utf-8")

        metadata = {
            "char_count": len(text),
            "word_count": len(text.split()),
        }

        return {
            "text": text.strip(),
            "metadata": metadata,
        }

    @staticmethod
    def parse_markdown(file_content: bytes) -> Dict[str, Any]:
        """
        Parse Markdown file.

        Args:
            file_content: Markdown file content as bytes

        Returns:
            Dictionary with extracted text and metadata
        """
        # For now, treat as plain text
        text = file_content.decode("utf-8")

        metadata = {
            "char_count": len(text),
            "word_count": len(text.split()),
            "format": "markdown",
        }

        return {
            "text": text.strip(),
            "metadata": metadata,
        }

    @classmethod
    def parse_document(cls, file_content: bytes, file_type: str) -> Dict[str, Any]:
        """
        Parse document based on file type.

        Args:
            file_content: File content as bytes
            file_type: MIME type or file extension

        Returns:
            Dictionary with extracted text and metadata

        Raises:
            ValueError: If file type is not supported
        """
        if file_type in ["application/pdf", "pdf"]:
            return cls.parse_pdf(file_content)
        elif file_type in ["text/plain", "txt"]:
            return cls.parse_txt(file_content)
        elif file_type in ["text/markdown", "md", "markdown"]:
            return cls.parse_markdown(file_content)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
