"""Documents API endpoints."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.services.document_service import DocumentService

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])


@router.post("/", response_model=DocumentListResponse, status_code=status.HTTP_201_CREATED)
async def upload_documents(
    project_id: UUID,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload documents to a project."""
    service = DocumentService(db)

    uploaded_docs = []
    failed_count = 0

    for file in files:
        try:
            # Read file content
            content = await file.read()

            # Determine file type
            file_type = file.content_type or "text/plain"
            if file.filename and file.filename.endswith(".pdf"):
                file_type = "application/pdf"
            elif file.filename and file.filename.endswith(".md"):
                file_type = "text/markdown"

            # Create document
            document = await service.create_document(
                project_id=project_id,
                file_content=content,
                filename=file.filename or "untitled",
                file_type=file_type,
            )
            uploaded_docs.append(document)

        except Exception as e:
            failed_count += 1
            print(f"Failed to upload {file.filename}: {str(e)}")

    return DocumentListResponse(
        uploaded=len(uploaded_docs),
        failed=failed_count,
        documents=uploaded_docs,
    )


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """List documents in a project."""
    service = DocumentService(db)
    documents = await service.list_documents(project_id)
    return documents


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    project_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get document by ID."""
    service = DocumentService(db)
    document = await service.get_document(document_id)

    if not document or document.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found",
        )

    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    project_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete document by ID."""
    service = DocumentService(db)
    document = await service.get_document(document_id)

    if not document or document.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found",
        )

    await service.delete_document(document_id)
