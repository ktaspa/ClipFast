from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import VideoUpload, Job, ActivityEvent
from job_options import DEFAULT_PROCESSING_OPTIONS_JSON
from schemas import VideoUploadResponse
import uuid
from typing import Annotated

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.get("", response_model=list[VideoUploadResponse])
async def list_uploads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VideoUpload).order_by(VideoUpload.created_at.desc()))
    return result.scalars().all()


@router.post("/{upload_id}/confirm", response_model=VideoUploadResponse)
async def confirm_upload(upload_id: Annotated[str, Path(min_length=1, max_length=80)], bg: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(VideoUpload).where(VideoUpload.id == upload_id))
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    if upload.status not in ("pending_confirmation",):
        raise HTTPException(status_code=400, detail=f"Upload already in status: {upload.status!r}")

    job = Job(
        id=str(uuid.uuid4()),
        youtube_url=upload.youtube_url,
        title=upload.title,
        status="pending",
        processing_options=DEFAULT_PROCESSING_OPTIONS_JSON,
    )
    db.add(job)
    upload.status = "processing"
    upload.job_id = job.id

    event = ActivityEvent(
        id=str(uuid.uuid4()),
        event_type="clipping_confirmed",
        description=f"User confirmed clipping: {upload.title or upload.youtube_url}",
    )
    db.add(event)
    await db.commit()
    await db.refresh(upload)

    from jobs import _process_job
    bg.add_task(_process_job, job.id)

    return upload
