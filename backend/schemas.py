from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator
from typing import Optional
from datetime import datetime

from security import sanitize_text, validate_http_url, validate_youtube_url


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ClipResponse(BaseModel):
    id: str
    job_id: str
    title: str
    description: Optional[str] = None
    hook_text: Optional[str] = None
    caption_override: Optional[str] = None
    start_time: float
    end_time: float
    duration: float
    file_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    viral_score: Optional[float] = None
    status: str = "ready"
    created_at: datetime

    model_config = {"from_attributes": True}


class JobCreate(StrictBaseModel):
    youtube_url: str = Field(min_length=10, max_length=2048)
    burn_captions: bool = True
    burn_hook: bool = True
    letterbox: bool = True
    clip_min_seconds: float = Field(default=15, ge=5, le=120)
    clip_max_seconds: float = Field(default=90, ge=10, le=180)
    clip_count: int = Field(default=5, ge=1, le=5)

    @field_validator("youtube_url")
    @classmethod
    def youtube_url_safe(cls, value: str) -> str:
        return validate_youtube_url(value)

    @model_validator(mode="after")
    def clip_range_order(self):
        if self.clip_max_seconds < self.clip_min_seconds:
            raise ValueError("clip_max_seconds must be >= clip_min_seconds")
        return self


class JobResponse(BaseModel):
    id: str
    youtube_url: str
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    status: str
    error: Optional[str] = None
    clips: list[ClipResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClipRemix(StrictBaseModel):
    """Re-render a clip from the source video with optional new timing + caption text."""

    start_time: Optional[float] = Field(default=None, ge=0, le=86400)
    end_time: Optional[float] = Field(default=None, ge=0, le=86400)
    hook_text: Optional[str] = Field(default=None, max_length=120)
    caption_override: Optional[str] = Field(default=None, max_length=600)
    reset_caption: bool = False

    @field_validator("hook_text", "caption_override")
    @classmethod
    def text_safe(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return sanitize_text(value, max_len=600)


class ChannelCreate(StrictBaseModel):
    channel_url: str = Field(min_length=10, max_length=2048)

    @field_validator("channel_url")
    @classmethod
    def channel_url_safe(cls, value: str) -> str:
        return validate_youtube_url(value)


class ChannelResponse(BaseModel):
    id: str
    channel_url: str
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None
    channel_thumbnail: Optional[str] = None
    status: str
    last_checked_at: Optional[datetime] = None
    created_at: datetime
    upload_count: int = 0

    model_config = {"from_attributes": True}


class VideoUploadResponse(BaseModel):
    id: str
    channel_id: str
    youtube_url: str
    youtube_video_id: str
    title: Optional[str] = None
    thumbnail_url: Optional[str] = None
    published_at: Optional[datetime] = None
    status: str
    job_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SocialAccountResponse(BaseModel):
    id: str
    platform: str
    status: str
    display_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityEventResponse(BaseModel):
    id: str
    event_type: str
    description: str
    meta: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreditBalanceResponse(BaseModel):
    free_clip_credits: int
    free_credits_used: int
    paid_clip_credits: int
    available_clip_credits: int
    next_pack_clip_credits: int
    next_pack_price_cents: int


class CheckoutSessionCreate(StrictBaseModel):
    success_url: HttpUrl
    cancel_url: HttpUrl

    @field_validator("success_url", "cancel_url")
    @classmethod
    def checkout_url_safe(cls, value: HttpUrl) -> str:
        return validate_http_url(str(value), max_len=2048)


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str
