from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Clip, ActivityEvent, Job
from schemas import ClipResponse, ClipRemix
from auth import get_current_user_id
from services import transcription_service, video_service
import uuid
import os
import re
import json
from typing import Annotated

router = APIRouter(prefix="/clips", tags=["clips"])


async def _get_clip_for_user(clip_id: str, user_id: str, db: AsyncSession) -> Clip:
    """Fetch a clip and verify it belongs to the requesting user."""
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    job_res = await db.execute(select(Job).where(Job.id == clip.job_id))
    job = job_res.scalar_one_or_none()
    if not job or job.user_id != user_id:
        raise HTTPException(status_code=404, detail="Clip not found")
    return clip


@router.get("", response_model=list[ClipResponse])
async def list_clips(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Clip)
        .join(Job, Clip.job_id == Job.id)
        .where(Job.user_id == user_id)
        .order_by(Clip.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{clip_id}", response_model=ClipResponse)
async def get_clip(
    clip_id: str = Path(..., min_length=1, max_length=80),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return await _get_clip_for_user(clip_id, user_id, db)


@router.post("/{clip_id}/approve", response_model=ClipResponse)
async def approve_clip(
    clip_id: str = Path(..., min_length=1, max_length=80),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    clip = await _get_clip_for_user(clip_id, user_id, db)
    clip.status = "approved"
    event = ActivityEvent(
        id=str(uuid.uuid4()),
        event_type="clip_approved",
        description=f"Clip approved for upload: {clip.title}",
    )
    db.add(event)
    await db.commit()
    await db.refresh(clip)
    return clip


@router.post("/{clip_id}/reject", response_model=ClipResponse)
async def reject_clip(
    clip_id: str = Path(..., min_length=1, max_length=80),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    clip = await _get_clip_for_user(clip_id, user_id, db)
    clip.status = "rejected"
    event = ActivityEvent(
        id=str(uuid.uuid4()),
        event_type="clip_rejected",
        description=f"Clip rejected: {clip.title}",
    )
    db.add(event)
    await db.commit()
    await db.refresh(clip)
    return clip


@router.get("/{clip_id}/download")
async def download_clip(
    clip_id: str = Path(..., min_length=1, max_length=80),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    clip = await _get_clip_for_user(clip_id, user_id, db)

    local_path = clip.file_path.lstrip("/") if clip.file_path else None
    if not local_path or not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Clip file not found")

    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in (clip.title or "clip"))
    return FileResponse(
        path=local_path,
        media_type="video/mp4",
        filename=f"{safe_title}.mp4",
    )


def _find_source_video(job_dir: str) -> str | None:
    mp4 = os.path.join(job_dir, "video.mp4")
    if os.path.exists(mp4):
        return mp4
    for name in os.listdir(job_dir) if os.path.isdir(job_dir) else []:
        if name.startswith("video.") and not name.endswith(".part"):
            p = os.path.join(job_dir, name)
            if os.path.isfile(p):
                return p
    return None


def _clip_index_from_path(file_path: str | None) -> int | None:
    if not file_path:
        return None
    m = re.search(r"clip_(\d+)\.mp4", file_path)
    return int(m.group(1)) if m else None


@router.patch("/{clip_id}/remix", response_model=ClipResponse)
async def remix_clip(
    clip_id: Annotated[str, Path(min_length=1, max_length=80)],
    payload: ClipRemix,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    clip = await _get_clip_for_user(clip_id, user_id, db)

    job_result = await db.execute(select(Job).where(Job.id == clip.job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_dir = f"media/jobs/{job.id}"
    source = _find_source_video(job_dir)
    if not source:
        raise HTTPException(status_code=400, detail="Source video not found for this job")

    idx = _clip_index_from_path(clip.file_path)
    if not idx:
        raise HTTPException(status_code=400, detail="Cannot determine clip file index")

    out_mp4 = os.path.join(job_dir, "clips", f"clip_{idx}.mp4")
    out_thumb = os.path.join(job_dir, "clips", f"clip_{idx}_thumb.jpg")
    os.makedirs(os.path.dirname(out_mp4), exist_ok=True)

    new_start = float(payload.start_time) if payload.start_time is not None else float(clip.start_time)
    new_end = float(payload.end_time) if payload.end_time is not None else float(clip.end_time)
    if new_end - new_start < 1.0:
        raise HTTPException(status_code=400, detail="Clip must be at least 1 second")

    transcript_path = os.path.join(job_dir, "transcript.json")
    words: list[dict] = []
    if os.path.exists(transcript_path):
        try:
            with open(transcript_path, encoding="utf-8") as tf:
                data = json.load(tf)
                words = data.get("words") or []
        except (OSError, json.JSONDecodeError):
            words = []

    reset_caption = payload.reset_caption

    # caption_override semantics:
    # - omitted (None): keep existing DB value
    # - "": explicitly remove burned captions (no subs)
    # - non-empty: custom caption text
    caption_override_val = clip.caption_override
    if reset_caption:
        caption_override_val = None
    elif payload.caption_override is not None:
        val = payload.caption_override
        caption_override_val = None if val.strip() == "" else val

    use_words: list[dict] | None = None
    co_for_render: str | None = None

    hook_for_render = clip.hook_text
    if payload.hook_text is not None:
        ht = payload.hook_text.strip()
        hook_for_render = ht if ht else None

    if reset_caption:
        if not words:
            try:
                td = await transcription_service.transcribe_video(source)
                words = td.get("words") or []
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Could not reload transcript: {e}")
        use_words = words
    elif payload.caption_override is not None and payload.caption_override.strip() == "":
        co_for_render = ""
    elif caption_override_val is not None:
        co_for_render = caption_override_val
    else:
        if words:
            use_words = words

    try:
        await video_service.remix_clip_from_source(
            source,
            out_mp4,
            new_start,
            new_end,
            words=use_words,
            hook_text=hook_for_render,
            caption_override=co_for_render,
            reset_caption=reset_caption,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remix failed: {e}")

    await video_service.generate_thumbnail(out_mp4, out_thumb)

    clip.start_time = round(new_start, 2)
    clip.end_time = round(new_end, 2)
    clip.duration = round(new_end - new_start, 2)
    if payload.hook_text is not None:
        clip.hook_text = hook_for_render
    clip.caption_override = caption_override_val
    clip.file_path = f"/media/jobs/{job.id}/clips/clip_{idx}.mp4"
    clip.thumbnail_path = f"/media/jobs/{job.id}/clips/clip_{idx}_thumb.jpg"

    event = ActivityEvent(
        id=str(uuid.uuid4()),
        event_type="clip_remixed",
        description=f"Clip remixed: {clip.title}",
    )
    db.add(event)
    await db.commit()
    await db.refresh(clip)
    return clip
