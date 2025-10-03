"""Settings service for managing application settings."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import Settings


class SettingsService:
    """Service for settings-related operations."""

    def __init__(self, db: AsyncSession):
        """Initialize service with database session."""
        self.db = db

    async def get_setting(self, key: str) -> str | None:
        """Get a setting value by key."""
        query = select(Settings).where(Settings.key == key)
        result = await self.db.execute(query)
        setting = result.scalar_one_or_none()
        return setting.value if setting else None

    async def set_setting(self, key: str, value: str, is_secret: bool = False) -> Settings:
        """Set or update a setting."""
        query = select(Settings).where(Settings.key == key)
        result = await self.db.execute(query)
        setting = result.scalar_one_or_none()

        if setting:
            setting.value = value
            setting.is_secret = is_secret
        else:
            setting = Settings(key=key, value=value, is_secret=is_secret)
            self.db.add(setting)

        await self.db.commit()
        await self.db.refresh(setting)
        return setting

    async def delete_setting(self, key: str) -> bool:
        """Delete a setting by key."""
        query = select(Settings).where(Settings.key == key)
        result = await self.db.execute(query)
        setting = result.scalar_one_or_none()

        if not setting:
            return False

        await self.db.delete(setting)
        await self.db.commit()
        return True

    async def get_openai_key(self) -> str | None:
        """Get OpenAI API key."""
        return await self.get_setting("openai_api_key")

    async def set_openai_key(self, api_key: str) -> Settings:
        """Set OpenAI API key."""
        return await self.set_setting("openai_api_key", api_key, is_secret=True)
