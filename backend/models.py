from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base


def _gen_id() -> str:
    return str(uuid.uuid4())


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=_gen_id)
    youtube_url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    error = Column(String, nullable=True)
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
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)
    file_path = Column(String, nullable=True)
    thumbnail_path = Column(String, nullable=True)
    viral_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
