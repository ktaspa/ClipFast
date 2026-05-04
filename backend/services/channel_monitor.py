"""
Background polling: detect new YouTube uploads on monitored channels and auto-start clip jobs.

Only videos newer than `Channel.last_seen_youtube_video_id` (set at subscribe time) are considered.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal
from job_options import DEFAULT_PROCESSING_OPTIONS_JSON
from models import ActivityEvent, Channel, Job, VideoUpload

POLL_INTERVAL_SEC = int(os.getenv("CHANNEL_POLL_INTERVAL_SEC", str(3 * 3600)))
INITIAL_DELAY_SEC = int(os.getenv("CHANNEL_POLL_INITIAL_DELAY_SEC", "60"))


def schedule_process_job(job_id: str) -> None:
    from routes.jobs import _process_job

    asyncio.create_task(_process_job(job_id))


async def scan_channel(db: AsyncSession, channel: Channel) -> None:
    import channel_service

    try:
        vd = await channel_service.fetch_channel_videos(channel.channel_url, max_videos=35)
    except Exception as e:
        print(f"[channel_monitor] yt-dlp failed for channel {channel.id}: {e}")
        return

    videos = vd.get("videos") or []
    now = datetime.now(timezone.utc)

    if not videos:
        channel.last_checked_at = now
        await db.commit()
        return

    baseline = channel.last_seen_youtube_video_id
    if not baseline:
        channel.last_seen_youtube_video_id = videos[0]["id"]
        channel.last_checked_at = now
        await db.commit()
        return

    feed_ids = [v["id"] for v in videos]
    if baseline not in feed_ids:
        channel.last_seen_youtube_video_id = videos[0]["id"]
        channel.last_checked_at = now
        await db.commit()
        print(
            f"[channel_monitor] baseline video missing from recent feed for channel {channel.id}; "
            f"reset marker to {videos[0]['id']}"
        )
        return

    new_videos: list[dict] = []
    for v in videos:
        if v["id"] == baseline:
            break
        new_videos.append(v)

    if not new_videos:
        channel.last_checked_at = now
        await db.commit()
        return

    job_ids: list[str] = []
    # Oldest of the new batch first (stable order)
    for v in reversed(new_videos):
        dup = await db.execute(
            select(VideoUpload).where(VideoUpload.youtube_video_id == v["id"])
        )
        if dup.scalar_one_or_none():
            continue

        job_id = str(uuid.uuid4())
        job = Job(
            id=job_id,
            youtube_url=v["url"],
            title=v.get("title"),
            thumbnail_url=v.get("thumbnail_url"),
            status="pending",
            processing_options=DEFAULT_PROCESSING_OPTIONS_JSON,
        )
        upload = VideoUpload(
            id=str(uuid.uuid4()),
            channel_id=channel.id,
            youtube_url=v["url"],
            youtube_video_id=v["id"],
            title=v.get("title"),
            thumbnail_url=v.get("thumbnail_url"),
            status="processing",
            job_id=job_id,
        )
        db.add(job)
        db.add(upload)
        db.add(
            ActivityEvent(
                id=str(uuid.uuid4()),
                event_type="upload_detected",
                description=f"New upload — clipping started automatically: {v.get('title') or v['id']}",
            )
        )
        job_ids.append(job_id)

    channel.last_seen_youtube_video_id = videos[0]["id"]
    channel.last_checked_at = now
    await db.commit()

    for jid in job_ids:
        schedule_process_job(jid)


async def poll_all_channels_once() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Channel).where(Channel.status == "active"))
        ids = [c.id for c in result.scalars().all()]
    for cid in ids:
        async with AsyncSessionLocal() as db:
            r = await db.execute(select(Channel).where(Channel.id == cid))
            ch = r.scalar_one_or_none()
            if not ch:
                continue
            try:
                await scan_channel(db, ch)
            except Exception as e:
                print(f"[channel_monitor] scan_channel {cid} error: {e}")
                await db.rollback()


async def channel_poll_loop() -> None:
    await asyncio.sleep(INITIAL_DELAY_SEC)
    while True:
        try:
            await poll_all_channels_once()
        except Exception as e:
            print(f"[channel_monitor] poll_all_channels_once: {e}")
        await asyncio.sleep(POLL_INTERVAL_SEC)
