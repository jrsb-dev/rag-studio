"""Tests for document parser."""

import pytest
from app.core.document_parser import DocumentParser


def test_parse_txt():
    """Test parsing text file."""
    content = b"This is a test document.\nWith multiple lines."
    result = DocumentParser.parse_txt(content)

    assert result["text"] == "This is a test document.\nWith multiple lines."
    assert result["metadata"]["char_count"] > 0
    assert result["metadata"]["word_count"] > 0


def test_parse_markdown():
    """Test parsing markdown file."""
    content = b"# Title\n\nThis is a **markdown** document."
    result = DocumentParser.parse_markdown(content)

    assert "Title" in result["text"]
    assert "markdown" in result["text"]
    assert result["metadata"]["format"] == "markdown"


def test_parse_pdf():
    """Test parsing PDF file (minimal test)."""
    # Create a minimal PDF structure (this is a simplified test)
    # In production, use a real PDF file
    pdf_content = b"%PDF-1.4\n%%EOF"

    with pytest.raises(Exception):
        # This will fail with invalid PDF, which is expected
        DocumentParser.parse_pdf(pdf_content)


def test_parse_document_unsupported():
    """Test parsing unsupported file type."""
    content = b"test content"

    with pytest.raises(ValueError, match="Unsupported file type"):
        DocumentParser.parse_document(content, "application/unknown")


def test_parse_document_by_type():
    """Test parsing document based on file type."""
    content = b"Test content"

    # Test text
    result = DocumentParser.parse_document(content, "text/plain")
    assert result["text"] == "Test content"

    # Test markdown
    result = DocumentParser.parse_document(content, "text/markdown")
    assert result["text"] == "Test content"
