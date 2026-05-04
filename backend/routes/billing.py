from datetime import datetime, timezone
import os
import uuid

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user_id
from database import AsyncSessionLocal, get_db
from models import StripeCheckoutPurchase
from schemas import CreditBalanceResponse, CheckoutSessionCreate, CheckoutSessionResponse
from services.credit_service import (
    PAID_PACK_CLIP_CREDITS,
    PAID_PACK_PRICE_CENTS,
    get_or_create_credits,
    serialize_balance,
)

router = APIRouter(prefix="/billing", tags=["billing"])


def _stripe_value(obj, key: str, default=None):
    if obj is None:
        return default
    try:
        value = obj[key]
    except (KeyError, TypeError):
        return default
    return default if value is None else value


def _stripe_api_key() -> str:
    key = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
    if not key:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY not configured")
    return key


@router.get("/credits", response_model=CreditBalanceResponse)
async def credit_balance(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    row = await get_or_create_credits(db, user_id)
    await db.commit()
    return serialize_balance(row)


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CheckoutSessionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    stripe.api_key = _stripe_api_key()

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=f"{payload.success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=payload.cancel_url,
            client_reference_id=user_id,
            metadata={
                "user_id": user_id,
                "clip_credits": str(PAID_PACK_CLIP_CREDITS),
            },
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": PAID_PACK_PRICE_CENTS,
                        "product_data": {
                            "name": "ClixFair 20 clip credits",
                            "description": "Adds 20 AI clip generation credits to your account.",
                        },
                    },
                    "quantity": 1,
                }
            ],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Stripe checkout failed: {exc}") from exc

    purchase = StripeCheckoutPurchase(
        id=str(uuid.uuid4()),
        user_id=user_id,
        stripe_session_id=session.id,
        status="pending",
        clip_credits=PAID_PACK_CLIP_CREDITS,
        amount_cents=PAID_PACK_PRICE_CENTS,
    )
    db.add(purchase)
    await db.commit()
    if not session.url:
        raise HTTPException(status_code=502, detail="Stripe did not return a checkout URL")
    return {"checkout_url": session.url, "session_id": session.id}


async def _grant_checkout_credits(db: AsyncSession, session_id: str, user_id: str, credits: int) -> bool:
    result = await db.execute(
        select(StripeCheckoutPurchase).where(StripeCheckoutPurchase.stripe_session_id == session_id)
    )
    purchase = result.scalar_one_or_none()
    if purchase and purchase.status == "completed":
        return False

    if not purchase:
        purchase = StripeCheckoutPurchase(
            id=str(uuid.uuid4()),
            user_id=user_id,
            stripe_session_id=session_id,
            status="pending",
            clip_credits=credits,
            amount_cents=PAID_PACK_PRICE_CENTS,
        )
        db.add(purchase)

    row = await get_or_create_credits(db, user_id)
    row.paid_clip_credits = int(row.paid_clip_credits or 0) + int(credits)
    purchase.status = "completed"
    purchase.completed_at = datetime.now(timezone.utc)
    await db.commit()
    return True


@router.post("/checkout/verify", response_model=CreditBalanceResponse)
async def verify_checkout_session(
    session_id: str = Query(..., min_length=10, max_length=255, pattern=r"^cs_(test|live)_[A-Za-z0-9]+$"),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    stripe.api_key = _stripe_api_key()
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not verify checkout session: {exc}") from exc

    if _stripe_value(session, "payment_status") != "paid":
        raise HTTPException(status_code=402, detail="Checkout session is not paid")
    if _stripe_value(session, "client_reference_id") != user_id:
        raise HTTPException(status_code=403, detail="Checkout session does not belong to this user")

    metadata = _stripe_value(session, "metadata", {}) or {}
    credits = int(_stripe_value(metadata, "clip_credits", PAID_PACK_CLIP_CREDITS))
    await _grant_checkout_credits(db, session.id, user_id, credits)
    row = await get_or_create_credits(db, user_id)
    return serialize_balance(row)


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
):
    secret = (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip()
    if not secret:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET not configured")

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Stripe webhook: {exc}") from exc

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        if _stripe_value(session, "payment_status") == "paid":
            metadata = _stripe_value(session, "metadata", {}) or {}
            user_id = _stripe_value(session, "client_reference_id") or _stripe_value(metadata, "user_id")
            credits = int(_stripe_value(metadata, "clip_credits", PAID_PACK_CLIP_CREDITS))
            if user_id:
                async with AsyncSessionLocal() as db:
                    await _grant_checkout_credits(db, session["id"], user_id, credits)

    return {"received": True}
