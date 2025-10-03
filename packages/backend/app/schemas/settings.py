"""Settings schemas."""

from pydantic import BaseModel, Field


class SettingsUpdate(BaseModel):
    """Schema for updating settings."""

    openai_api_key: str | None = Field(None, min_length=1)


class SettingsResponse(BaseModel):
    """Schema for settings responses."""

    openai_api_key_set: bool = Field(..., description="Whether OpenAI API key is configured")

    model_config = {
        "from_attributes": True,
    }
