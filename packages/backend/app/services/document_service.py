"""Document service for business logic."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.schemas.document import DocumentCreate
from app.core.document_parser import DocumentParser


class DocumentService:
    """Service for document-related operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def create_document(
        self,
        project_id: UUID,
        file_content: bytes,
        filename: str,
        file_type: str,
    ) -> Document:
        """Create a new document from uploaded file."""
        # Parse document
        parsed = DocumentParser.parse_document(file_content, file_type)

        # Create document
        document_data = DocumentCreate(
            filename=filename,
            content=parsed["text"],
            file_type=file_type,
            file_size=len(file_content),
            doc_metadata=parsed.get("metadata"),
        )

        document = Document(
            project_id=project_id,
            **document_data.model_dump(by_alias=False),
        )

        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        return document

    async def get_document(self, document_id: UUID) -> Document | None:
        """Get document by ID."""
        query = select(Document).where(Document.id == document_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_documents(self, project_id: UUID) -> list[Document]:
        """List documents for a project."""
        query = (
            select(Document)
            .where(Document.project_id == project_id)
            .order_by(Document.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete_document(self, document_id: UUID) -> bool:
        """Delete document."""
        document = await self.get_document(document_id)
        if not document:
            return False

        await self.db.delete(document)
        await self.db.commit()
        return True
