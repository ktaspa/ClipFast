from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class ClipResponse(BaseModel):
    id: str
    job_id: str
    title: str
    description: Optional[str] = None
    start_time: float
    end_time: float
    duration: float
    file_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    viral_score: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class JobCreate(BaseModel):
    youtube_url: str


class JobResponse(BaseModel):
    id: str
    youtube_url: str
    title: Optional[str] = None
    status: str
    error: Optional[str] = None
    clips: list[ClipResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
