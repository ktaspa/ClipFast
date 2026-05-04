from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import SocialAccount
from schemas import SocialAccountResponse
import uuid
import os
import secrets
import httpx
from urllib.parse import urlencode

router = APIRouter(prefix="/socials", tags=["socials"])

PLATFORMS = ("tiktok", "instagram", "youtube")

_YOUTUBE_SCOPES = " ".join([
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
])


@router.get("", response_model=list[SocialAccountResponse])
async def list_socials(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SocialAccount).order_by(SocialAccount.platform))
    accounts = {a.platform: a for a in result.scalars().all()}

    for p in PLATFORMS:
        if p not in accounts:
            acc = SocialAccount(id=str(uuid.uuid4()), platform=p, status="disconnected")
            db.add(acc)
            accounts[p] = acc
    await db.commit()

    return list(accounts.values())


# ── YouTube OAuth ─────────────────────────────────────────────────────────────

@router.get("/youtube/auth-url")
async def youtube_auth_url(redirect_uri: str = Query(..., min_length=10, max_length=2048)):
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured")

    state = secrets.token_urlsafe(32)
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": _YOUTUBE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return {"auth_url": auth_url, "state": state}


@router.post("/youtube/exchange", response_model=SocialAccountResponse)
async def youtube_exchange(
    code: str = Query(..., min_length=10, max_length=4096),
    redirect_uri: str = Query(..., min_length=10, max_length=2048),
    db: AsyncSession = Depends(get_db),
):
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth credentials not configured")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_res.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {token_res.text}")

    token_data = token_res.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")

    channel_name = "YouTube Channel"
    async with httpx.AsyncClient() as client:
        ch_res = await client.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "snippet", "mine": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if ch_res.status_code == 200:
        items = ch_res.json().get("items", [])
        if items:
            channel_name = items[0]["snippet"]["title"]

    result = await db.execute(select(SocialAccount).where(SocialAccount.platform == "youtube"))
    account = result.scalar_one_or_none()
    if not account:
        account = SocialAccount(id=str(uuid.uuid4()), platform="youtube")
        db.add(account)

    account.status = "connected"
    account.display_name = channel_name
    account.access_token = access_token
    account.refresh_token = refresh_token
    await db.commit()
    await db.refresh(account)
    return account


# ── Generic connect (placeholder for TikTok / Instagram) ─────────────────────

@router.post("/{platform}/connect-placeholder", response_model=SocialAccountResponse)
async def connect_placeholder(platform: str = Path(..., pattern="^(tiktok|instagram|youtube)$"), db: AsyncSession = Depends(get_db)):
    if platform not in PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform!r}")
    result = await db.execute(select(SocialAccount).where(SocialAccount.platform == platform))
    account = result.scalar_one_or_none()
    if not account:
        account = SocialAccount(id=str(uuid.uuid4()), platform=platform)
        db.add(account)
    account.status = "connected"
    account.display_name = f"@demo_{platform}"
    await db.commit()
    await db.refresh(account)
    return account


@router.post("/{platform}/disconnect", response_model=SocialAccountResponse)
async def disconnect(platform: str = Path(..., pattern="^(tiktok|instagram|youtube)$"), db: AsyncSession = Depends(get_db)):
    if platform not in PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform!r}")
    result = await db.execute(select(SocialAccount).where(SocialAccount.platform == platform))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.status = "disconnected"
    account.display_name = None
    account.access_token = None
    account.refresh_token = None
    await db.commit()
    await db.refresh(account)
    return account
