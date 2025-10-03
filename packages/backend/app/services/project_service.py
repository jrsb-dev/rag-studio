"""Project service for business logic."""

from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.document import Document
from app.models.config import Config
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    """Service for project-related operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def create_project(self, project_data: ProjectCreate) -> Project:
        """Create a new project."""
        project = Project(**project_data.model_dump())
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def get_project(self, project_id: UUID) -> Project | None:
        """Get project by ID with counts."""
        query = select(Project).where(Project.id == project_id)
        result = await self.db.execute(query)
        project = result.scalar_one_or_none()

        if project:
            # Get counts
            doc_count_query = select(func.count()).select_from(Document).where(
                Document.project_id == project_id
            )
            doc_count = await self.db.scalar(doc_count_query)

            config_count_query = select(func.count()).select_from(Config).where(
                Config.project_id == project_id
            )
            config_count = await self.db.scalar(config_count_query)

            # Add counts as attributes
            project.document_count = doc_count
            project.config_count = config_count

        return project

    async def list_projects(self) -> list[Project]:
        """List all projects."""
        query = select(Project).order_by(Project.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_project(self, project_id: UUID, project_data: ProjectUpdate) -> Project | None:
        """Update project."""
        project = await self.get_project(project_id)
        if not project:
            return None

        update_data = project_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(project, key, value)

        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(self, project_id: UUID) -> bool:
        """Delete project."""
        project = await self.get_project(project_id)
        if not project:
            return False

        await self.db.delete(project)
        await self.db.commit()
        return True
