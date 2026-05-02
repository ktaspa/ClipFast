from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db, AsyncSessionLocal
from ..models import Job, Clip
from ..schemas import JobCreate, JobResponse
import os
import uuid
import traceback

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(payload: JobCreate, bg: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    job = Job(id=str(uuid.uuid4()), youtube_url=payload.youtube_url, status="pending")
    db.add(job)
    await db.commit()
    await db.refresh(job)
    bg.add_task(_process_job, job.id)
    return job


@router.get("", response_model=list[JobResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
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


async def _process_job(job_id: str):
    from ..services import youtube_service, transcription_service, ai_service, video_service

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
            await db.commit()

            video_path: str = video_info["file_path"]
            video_duration: float = video_info["duration"]

            # 2 — Transcribe
            await _set_status(db, job_id, "transcribing")
            transcript_data = await transcription_service.transcribe_video(video_path)

            # 3 — AI analysis
            await _set_status(db, job_id, "analyzing")
            clip_suggestions = await ai_service.identify_viral_clips(
                transcript_data["text"], video_duration
            )

            # 4 — Cut & caption clips
            await _set_status(db, job_id, "clipping")
            for i, suggestion in enumerate(clip_suggestions[:5]):
                clip_file = f"{clips_dir}/clip_{i + 1}.mp4"
                thumb_file = f"{clips_dir}/clip_{i + 1}_thumb.jpg"

                try:
                    await video_service.create_clip_with_captions(
                        input_path=video_path,
                        output_path=clip_file,
                        start_time=suggestion["start_time"],
                        end_time=suggestion["end_time"],
                        words=transcript_data.get("words", []),
                    )
                    await video_service.generate_thumbnail(clip_file, thumb_file)
                except Exception as e:
                    print(f"[clip {i+1}] error: {e}")
                    continue

                clip = Clip(
                    id=str(uuid.uuid4()),
                    job_id=job_id,
                    title=suggestion["title"],
                    description=suggestion.get("description"),
                    start_time=suggestion["start_time"],
                    end_time=suggestion["end_time"],
                    duration=suggestion["duration"],
                    file_path=f"/media/jobs/{job_id}/clips/clip_{i + 1}.mp4"
                    if os.path.exists(clip_file)
                    else None,
                    thumbnail_path=f"/media/jobs/{job_id}/clips/clip_{i + 1}_thumb.jpg"
                    if os.path.exists(thumb_file)
                    else None,
                    viral_score=suggestion.get("viral_score", 7.0),
                )
                db.add(clip)
                await db.commit()

            await _set_status(db, job_id, "completed")

        except Exception:
            err = traceback.format_exc()
            print(f"[job {job_id}] FAILED:\n{err}")
            await _set_status(db, job_id, "failed", err)
