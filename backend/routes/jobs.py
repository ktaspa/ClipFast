from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import OperationalError, DBAPIError
from database import get_db, AsyncSessionLocal
from models import Job, Clip, VideoUpload
from schemas import JobCreate, JobResponse
from auth import get_current_user_id
from services.credit_service import reserve_clip_credits, refund_clip_credits
import os
import uuid
import traceback
import json
import asyncio

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _is_db_unreachable(exc: Exception) -> bool:
    if isinstance(exc, (ConnectionRefusedError, OSError)):
        return True
    if isinstance(exc, OperationalError):
        return True
    if isinstance(exc, DBAPIError):
        return True
    return False


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    payload: JobCreate,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    requested_clip_count = max(1, min(5, int(payload.clip_count)))
    reserved_clip_count = await reserve_clip_credits(db, user_id, requested_clip_count)
    if reserved_clip_count <= 0:
        await db.rollback()
        raise HTTPException(
            status_code=402,
            detail="You are out of clip credits. Add the $5 pack to generate 20 more clips.",
        )

    opts = {
        "burn_captions": payload.burn_captions,
        "burn_hook": payload.burn_hook,
        "letterbox": payload.letterbox,
        "clip_min_seconds": payload.clip_min_seconds,
        "clip_max_seconds": payload.clip_max_seconds,
        "clip_count": reserved_clip_count,
    }
    job = Job(
        id=str(uuid.uuid4()),
        youtube_url=payload.youtube_url,
        user_id=user_id,
        status="pending",
        processing_options=json.dumps(opts),
        credit_cost=reserved_clip_count,
    )
    db.add(job)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        if _is_db_unreachable(e):
            raise HTTPException(
                status_code=503,
                detail="Database unavailable (is Postgres running?). Start it with `docker compose up -d postgres` or set DATABASE_URL.",
            ) from e
        raise
    await db.refresh(job)
    bg.add_task(_process_job, job.id)
    return job


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Job).where(Job.user_id == user_id).order_by(Job.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str = Path(..., min_length=1, max_length=80),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: str = Path(..., min_length=1, max_length=80),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
    await db.commit()
    # Clean up media files
    job_dir = f"media/jobs/{job_id}"
    if os.path.exists(job_dir):
        import shutil
        shutil.rmtree(job_dir, ignore_errors=True)


# ── Background processing pipeline ──────────────────────────────────────────

async def _set_status(db: AsyncSession, job_id: str, status: str, error: str | None = None):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one()
    job.status = status
    if error is not None:
        job.error = error[:2000]
    await db.commit()


async def _sync_channel_upload_status(db: AsyncSession, job_id: str, upload_status: str) -> None:
    """Link channel auto-upload rows to finished jobs."""
    r = await db.execute(select(VideoUpload).where(VideoUpload.job_id == job_id))
    upload = r.scalar_one_or_none()
    if upload:
        upload.status = upload_status
        await db.commit()


async def _process_job(job_id: str):
    from services import youtube_service, transcription_service, ai_service, video_service

    async with AsyncSessionLocal() as db:
        job_dir = f"media/jobs/{job_id}"
        clips_dir = f"{job_dir}/clips"
        os.makedirs(clips_dir, exist_ok=True)

        try:
            # 1 — Download
            await _set_status(db, job_id, "downloading")
            result = await db.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one()

            video_info = await youtube_service.download_video(job.youtube_url, job_dir)
            job.title = video_info["title"]
            job.thumbnail_url = video_info.get("thumbnail_url")
            await db.commit()

            video_path: str = os.path.abspath(video_info["file_path"])
            video_duration: float = video_info["duration"]

            # 2 — Transcribe
            await _set_status(db, job_id, "transcribing")
            transcript_data = await transcription_service.transcribe_video(video_path)
            try:
                with open(os.path.join(job_dir, "transcript.json"), "w", encoding="utf-8") as tf:
                    json.dump(transcript_data, tf)
            except OSError:
                pass

            # 3 — AI analysis
            await _set_status(db, job_id, "analyzing")
            opts: dict = {}
            if job.processing_options:
                try:
                    opts = json.loads(job.processing_options)
                except (json.JSONDecodeError, TypeError):
                    opts = {}
            burn_captions = bool(opts.get("burn_captions", True))
            burn_hook = bool(opts.get("burn_hook", True))
            letterbox = bool(opts.get("letterbox", True))
            clip_min = float(opts.get("clip_min_seconds", 15))
            clip_max = float(opts.get("clip_max_seconds", 90))
            clip_count = int(opts.get("clip_count", 5))
            clip_count = max(1, min(5, clip_count))

            clip_suggestions = await ai_service.identify_viral_clips(
                transcript_data["text"],
                video_duration,
                words=transcript_data.get("words", []),
                clip_min_s=clip_min,
                clip_max_s=clip_max,
                max_clips=clip_count,
            )

            # 4 — Cut & caption clips
            await _set_status(db, job_id, "clipping")
            sem = asyncio.Semaphore(max(1, min(3, int(os.getenv("CLIPFAST_RENDER_CONCURRENCY", "2")))))

            async def render_one(i: int, suggestion: dict) -> tuple[int, dict, str, str] | None:
                clip_file = os.path.abspath(f"{clips_dir}/clip_{i + 1}.mp4")
                thumb_file = os.path.abspath(f"{clips_dir}/clip_{i + 1}_thumb.jpg")
                try:
                    async with sem:
                        await video_service.create_clip_with_captions(
                            input_path=video_path,
                            output_path=clip_file,
                            start_time=suggestion["start_time"],
                            end_time=suggestion["end_time"],
                            words=transcript_data.get("words", []),
                            hook_text=suggestion.get("hook") or None,
                            burn_captions=burn_captions,
                            burn_hook=burn_hook,
                            letterbox=letterbox,
                        )
                        await video_service.generate_thumbnail(clip_file, thumb_file)
                except Exception as e:
                    print(f"[clip {i+1}] error: {e}")
                    return None
                if not os.path.exists(clip_file):
                    return None
                return i, suggestion, clip_file, thumb_file

            rendered = await asyncio.gather(
                *(render_one(i, suggestion) for i, suggestion in enumerate(clip_suggestions[:clip_count]))
            )
            clips_created = 0
            for item in rendered:
                if not item:
                    continue
                i, suggestion, _clip_file, thumb_file = item
                clips_created += 1
                hook_stored = (suggestion.get("hook") or "").strip() or None
                clip = Clip(
                    id=str(uuid.uuid4()),
                    job_id=job_id,
                    title=suggestion["title"],
                    description=suggestion.get("description"),
                    hook_text=hook_stored,
                    start_time=suggestion["start_time"],
                    end_time=suggestion["end_time"],
                    duration=suggestion["duration"],
                    file_path=f"/media/jobs/{job_id}/clips/clip_{i + 1}.mp4",
                    thumbnail_path=f"/media/jobs/{job_id}/clips/clip_{i + 1}_thumb.jpg"
                    if os.path.exists(thumb_file)
                    else None,
                    viral_score=suggestion.get("viral_score", 7.0),
                )
                db.add(clip)
                await db.commit()

            if clips_created == 0:
                await refund_clip_credits(db, job.user_id, int(job.credit_cost or clip_count))
                await db.commit()
                await _set_status(
                    db,
                    job_id,
                    "failed",
                    "Clipping produced no output files. Install FFmpeg with libass for captions "
                    "(optional) and check server logs for [clip N] FFmpeg errors.",
                )
                await _sync_channel_upload_status(db, job_id, "failed")
                return

            if clips_created < int(job.credit_cost or clip_count):
                await refund_clip_credits(db, job.user_id, int(job.credit_cost or clip_count) - clips_created)
                await db.commit()

            await _set_status(db, job_id, "completed")
            await _sync_channel_upload_status(db, job_id, "ready")

        except youtube_service.YouTubeDownloadBlocked as exc:
            msg = str(exc)
            print(f"[job {job_id}] YouTube download blocked: {msg}")
            result = await db.execute(select(Job).where(Job.id == job_id))
            failed_job = result.scalar_one_or_none()
            if failed_job:
                await refund_clip_credits(db, failed_job.user_id, int(failed_job.credit_cost or 1))
                await db.commit()
            await _set_status(db, job_id, "failed", msg)
            await _sync_channel_upload_status(db, job_id, "failed")
        except Exception:
            err = traceback.format_exc()
            print(f"[job {job_id}] FAILED:\n{err}")
            result = await db.execute(select(Job).where(Job.id == job_id))
            failed_job = result.scalar_one_or_none()
            if failed_job:
                await refund_clip_credits(db, failed_job.user_id, int(failed_job.credit_cost or 1))
                await db.commit()
            await _set_status(db, job_id, "failed", err)
            await _sync_channel_upload_status(db, job_id, "failed")
