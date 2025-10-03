"""Settings API endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.settings import SettingsUpdate, SettingsResponse
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get current settings (without exposing secret values)."""
    service = SettingsService(db)

    openai_key = await service.get_openai_key()

    return SettingsResponse(
        openai_api_key_set=bool(openai_key),
    )


@router.put("/", response_model=SettingsResponse, status_code=status.HTTP_200_OK)
async def update_settings(
    settings_data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update settings."""
    service = SettingsService(db)

    # Update OpenAI API key if provided
    if settings_data.openai_api_key is not None:
        await service.set_openai_key(settings_data.openai_api_key)

    # Return updated status
    openai_key = await service.get_openai_key()

    return SettingsResponse(
        openai_api_key_set=bool(openai_key),
    )


@router.delete("/openai-key", status_code=status.HTTP_204_NO_CONTENT)
async def delete_openai_key(db: AsyncSession = Depends(get_db)):
    """Delete OpenAI API key."""
    service = SettingsService(db)
    await service.delete_setting("openai_api_key")
