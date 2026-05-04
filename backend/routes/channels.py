from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Channel, ActivityEvent
from schemas import ChannelCreate, ChannelResponse
from services import channel_service
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/channels", tags=["channels"])


@router.post("", response_model=ChannelResponse, status_code=201)
async def add_channel(payload: ChannelCreate, db: AsyncSession = Depends(get_db)):
    channel_url = payload.channel_url.strip()

    # Resolve metadata upfront so the UI never shows a placeholder avatar.
    # If yt-dlp can't resolve the channel, fail fast so users can retry.
    try:
        meta = await channel_service.fetch_channel_metadata(channel_url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch channel: {e}")

    channel_name = meta.get("channel_name")
    channel_thumbnail = meta.get("channel_thumbnail")
    if not channel_thumbnail:
        raise HTTPException(status_code=502, detail="Could not resolve channel profile picture. Please try again.")

    channel = Channel(
        id=str(uuid.uuid4()),
        channel_url=channel_url,
        channel_name=channel_name,
        channel_thumbnail=channel_thumbnail,
        status="active",
    )
    db.add(channel)
    event = ActivityEvent(
        id=str(uuid.uuid4()),
        event_type="channel_added",
        description=f"Channel added for monitoring: {channel_url}",
    )
    db.add(event)
    await db.commit()
    await db.refresh(channel)

    # Baseline: remember current newest upload so we never clip the back-catalog.
    try:
        vd = await channel_service.fetch_channel_videos(channel_url, max_videos=30)
        vids = vd.get("videos") or []
        if vids:
            channel.last_seen_youtube_video_id = vids[0]["id"]
        channel.last_checked_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(channel)
    except Exception as e:
        print(f"[channels] baseline init failed for {channel.id}: {e}")

    return ChannelResponse(
        id=channel.id,
        channel_url=channel.channel_url,
        channel_id=channel.channel_id,
        channel_name=channel.channel_name,
        channel_thumbnail=channel.channel_thumbnail,
        status=channel.status,
        last_checked_at=channel.last_checked_at,
        created_at=channel.created_at,
        upload_count=0,
    )


@router.get("", response_model=list[ChannelResponse])
async def list_channels(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Channel).order_by(Channel.created_at.desc()))
    channels = result.scalars().all()
    return [
        ChannelResponse(
            id=ch.id,
            channel_url=ch.channel_url,
            channel_id=ch.channel_id,
            channel_name=ch.channel_name,
            channel_thumbnail=ch.channel_thumbnail,
            status=ch.status,
            last_checked_at=ch.last_checked_at,
            created_at=ch.created_at,
            upload_count=len(ch.uploads),
        )
        for ch in channels
    ]


@router.delete("/{channel_id}", status_code=204)
async def delete_channel(channel_id: str = Path(..., min_length=1, max_length=80), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    await db.delete(channel)
    await db.commit()


## New uploads are polled by `services/channel_monitor` (default every 3 hours).
