from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from database import Base


def _gen_id() -> str:
    return str(uuid.uuid4())


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=_gen_id)
    youtube_url = Column(String, nullable=False)
    user_id = Column(String, nullable=True)
    title = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    error = Column(String, nullable=True)
    processing_options = Column(Text, nullable=True)
    credit_cost = Column(Integer, nullable=False, default=1)
    clips = relationship("Clip", back_populates="job", cascade="all, delete-orphan", lazy="selectin")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Clip(Base):
    __tablename__ = "clips"

    id = Column(String, primary_key=True, default=_gen_id)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    job = relationship("Job", back_populates="clips")
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    hook_text = Column(Text, nullable=True)
    caption_override = Column(Text, nullable=True)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)
    file_path = Column(String, nullable=True)
    thumbnail_path = Column(String, nullable=True)
    viral_score = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="ready")  # ready / approved / rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Channel(Base):
    __tablename__ = "channels"

    id = Column(String, primary_key=True, default=_gen_id)
    channel_url = Column(String, nullable=False)
    channel_id = Column(String, nullable=True)
    channel_name = Column(String, nullable=True)
    channel_thumbnail = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")  # active / paused / error
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    # Newest video ID known at last poll / subscribe; uploads before this are never clipped.
    last_seen_youtube_video_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    uploads = relationship("VideoUpload", back_populates="channel", cascade="all, delete-orphan", lazy="selectin")


class VideoUpload(Base):
    __tablename__ = "video_uploads"

    id = Column(String, primary_key=True, default=_gen_id)
    channel_id = Column(String, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    channel = relationship("Channel", back_populates="uploads")
    youtube_url = Column(String, nullable=False)
    youtube_video_id = Column(String, nullable=False, unique=True)
    title = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="pending_confirmation")
    # pending_confirmation / processing / ready / failed
    job_id = Column(String, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(String, primary_key=True, default=_gen_id)
    platform = Column(String, nullable=False, unique=True)  # tiktok / instagram / youtube
    status = Column(String, nullable=False, default="disconnected")  # disconnected / connected / needs_reauth
    display_name = Column(String, nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(String, primary_key=True, default=_gen_id)
    event_type = Column(String, nullable=False)
    # channel_added / upload_detected / clipping_confirmed / clips_ready / clip_approved / clip_rejected
    description = Column(String, nullable=False)
    meta = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserCredits(Base):
    __tablename__ = "user_credits"

    user_id = Column(String, primary_key=True)
    free_credits_used = Column(Integer, nullable=False, default=0)
    paid_clip_credits = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StripeCheckoutPurchase(Base):
    __tablename__ = "stripe_checkout_purchases"

    id = Column(String, primary_key=True, default=_gen_id)
    user_id = Column(String, nullable=False)
    stripe_session_id = Column(String, nullable=False, unique=True)
    status = Column(String, nullable=False, default="pending")
    clip_credits = Column(Integer, nullable=False, default=20)
    amount_cents = Column(Integer, nullable=False, default=500)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
