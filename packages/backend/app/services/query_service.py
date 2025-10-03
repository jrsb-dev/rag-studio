"""Query service for business logic."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.query import Query
from app.schemas.query import QueryCreate, QueryUpdate


class QueryService:
    """Service for query-related operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def create_query(self, project_id: UUID, query_data: QueryCreate) -> Query:
        """Create a new test query."""
        query = Query(
            project_id=project_id,
            **query_data.model_dump(),
        )

        self.db.add(query)
        await self.db.commit()
        await self.db.refresh(query)
        return query

    async def get_query(self, query_id: UUID) -> Query | None:
        """Get query by ID."""
        query = select(Query).where(Query.id == query_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_queries(self, project_id: UUID) -> list[Query]:
        """List queries for a project."""
        query = (
            select(Query)
            .where(Query.project_id == project_id)
            .order_by(Query.created_at.desc())
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_query(self, query_id: UUID, query_data: QueryUpdate) -> Query | None:
        """Update query."""
        query = await self.get_query(query_id)
        if not query:
            return None

        update_data = query_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(query, key, value)

        await self.db.commit()
        await self.db.refresh(query)
        return query

    async def delete_query(self, query_id: UUID) -> bool:
        """Delete query."""
        query = await self.get_query(query_id)
        if not query:
            return False

        await self.db.delete(query)
        await self.db.commit()
        return True
