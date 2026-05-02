from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Clip
from ..schemas import ClipResponse
import os

router = APIRouter(prefix="/clips", tags=["clips"])


@router.get("/{clip_id}", response_model=ClipResponse)
async def get_clip(clip_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return clip


@router.get("/{clip_id}/download")
async def download_clip(clip_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    # file_path stored as /media/... — strip leading slash for local path
    local_path = clip.file_path.lstrip("/") if clip.file_path else None
    if not local_path or not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Clip file not found")

    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in (clip.title or "clip"))
    return FileResponse(
        path=local_path,
        media_type="video/mp4",
        filename=f"{safe_title}.mp4",
    )
