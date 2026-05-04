from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import ActivityEvent
from schemas import ActivityEventResponse

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityEventResponse])
async def list_activity(limit: int = Query(default=50, ge=1, le=200), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ActivityEvent).order_by(ActivityEvent.created_at.desc()).limit(limit)
    )
    return result.scalars().all()
