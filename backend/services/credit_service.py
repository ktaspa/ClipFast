from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import UserCredits

FREE_CLIP_CREDITS = 1
PAID_PACK_CLIP_CREDITS = 20
PAID_PACK_PRICE_CENTS = 500


def available_clip_credits(row: UserCredits) -> int:
    free_left = max(0, FREE_CLIP_CREDITS - int(row.free_credits_used or 0))
    return free_left + max(0, int(row.paid_clip_credits or 0))


async def get_or_create_credits(db: AsyncSession, user_id: str) -> UserCredits:
    result = await db.execute(select(UserCredits).where(UserCredits.user_id == user_id))
    row = result.scalar_one_or_none()
    if row:
        return row
    row = UserCredits(user_id=user_id, free_credits_used=0, paid_clip_credits=0)
    db.add(row)
    await db.flush()
    return row


def serialize_balance(row: UserCredits) -> dict:
    return {
        "free_clip_credits": FREE_CLIP_CREDITS,
        "free_credits_used": int(row.free_credits_used or 0),
        "paid_clip_credits": int(row.paid_clip_credits or 0),
        "available_clip_credits": available_clip_credits(row),
        "next_pack_clip_credits": PAID_PACK_CLIP_CREDITS,
        "next_pack_price_cents": PAID_PACK_PRICE_CENTS,
    }


async def reserve_clip_credits(db: AsyncSession, user_id: str, requested: int) -> int:
    row = await get_or_create_credits(db, user_id)
    available = available_clip_credits(row)
    if available <= 0:
        return 0

    count = max(1, min(int(requested), available))
    free_left = max(0, FREE_CLIP_CREDITS - int(row.free_credits_used or 0))
    use_free = min(free_left, count)
    use_paid = count - use_free

    row.free_credits_used = int(row.free_credits_used or 0) + use_free
    row.paid_clip_credits = max(0, int(row.paid_clip_credits or 0) - use_paid)
    await db.flush()
    return count


async def refund_clip_credits(db: AsyncSession, user_id: str | None, count: int) -> None:
    if not user_id or count <= 0:
        return
    row = await get_or_create_credits(db, user_id)
    row.paid_clip_credits = int(row.paid_clip_credits or 0) + int(count)
    await db.flush()
