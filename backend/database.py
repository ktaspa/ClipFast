from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
import os
import socket
from urllib.parse import urlparse

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_SQLITE_PATH = os.path.join(os.path.dirname(_BACKEND_DIR), "clipfast_local.db")


def _default_sqlite_url() -> str:
    # Four slashes total: sqlite+aiosqlite:/// + absolute path starting with '/'
    return "sqlite+aiosqlite:///" + _DEFAULT_SQLITE_PATH


def _coerce_async_database_url(raw: str) -> str:
    if raw.startswith("postgres://"):
        return raw.replace("postgres://", "postgresql+asyncpg://", 1)
    if raw.startswith("postgresql://") and "+asyncpg" not in raw:
        return raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw


def _postgres_host_port(url: str) -> tuple[str, int] | None:
    try:
        parsed = urlparse(url)
    except Exception:
        return None
    host = parsed.hostname
    if not host:
        return None
    port = parsed.port or 5432
    return host, port


def _tcp_reachable(host: str, port: int, timeout: float = 0.35) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


_raw_url = os.getenv("DATABASE_URL", "postgresql://clipfast:clipfast_password@localhost:5432/clipfast")
_force_pg = os.getenv("CLIPFAST_FORCE_POSTGRES", "").strip() == "1"
_use_sqlite_flag = os.getenv("CLIPFAST_USE_SQLITE", "").strip() == "1"

if _use_sqlite_flag:
    DATABASE_URL = _default_sqlite_url()
elif (
    not _force_pg
    and (_raw_url.startswith("postgresql://") or _raw_url.startswith("postgres://"))
):
    _probe = _coerce_async_database_url(_raw_url)
    _hp = _postgres_host_port(_probe)
    if _hp and not _tcp_reachable(_hp[0], _hp[1]):
        print(
            "[database] Postgres unreachable at "
            f"{_hp[0]}:{_hp[1]}; using local SQLite ({_DEFAULT_SQLITE_PATH}). "
            "Start Postgres or set CLIPFAST_FORCE_POSTGRES=1 to fail fast."
        )
        DATABASE_URL = _default_sqlite_url()
    else:
        DATABASE_URL = _coerce_async_database_url(_raw_url)
else:
    DATABASE_URL = _coerce_async_database_url(_raw_url)

_engine_kwargs: dict = {
    "echo": False,
    "pool_pre_ping": not DATABASE_URL.startswith("sqlite+aiosqlite"),
}
if DATABASE_URL.startswith("sqlite+aiosqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    # Import models for side effects: register tables on Base.metadata before create_all.
    import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_columns(conn)


async def _ensure_columns(conn) -> None:
    """Lightweight migrations for dev/docker volumes (SQLAlchemy create_all won't ALTER)."""
    dialect = conn.engine.dialect.name

    async def has_column_pg(table: str, column: str) -> bool:
        res = await conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = :t AND column_name = :c
                LIMIT 1
                """
            ),
            {"t": table, "c": column},
        )
        return res.first() is not None

    async def has_column_sqlite(table: str, column: str) -> bool:
        res = await conn.execute(text(f"PRAGMA table_info({table})"))
        for row in res.mappings().all():
            if str(row.get("name")) == column:
                return True
        return False

    if dialect == "postgresql":
        has_column = has_column_pg
    elif dialect == "sqlite":
        has_column = has_column_sqlite
    else:
        return

    if not await has_column("jobs", "thumbnail_url"):
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN thumbnail_url VARCHAR"))
    if not await has_column("clips", "caption_override"):
        await conn.execute(text("ALTER TABLE clips ADD COLUMN caption_override TEXT"))
    if not await has_column("clips", "hook_text"):
        await conn.execute(text("ALTER TABLE clips ADD COLUMN hook_text TEXT"))
    if not await has_column("jobs", "processing_options"):
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN processing_options TEXT"))
    if not await has_column("jobs", "credit_cost"):
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN credit_cost INTEGER DEFAULT 1 NOT NULL"))
    if not await has_column("channels", "last_seen_youtube_video_id"):
        await conn.execute(text("ALTER TABLE channels ADD COLUMN last_seen_youtube_video_id VARCHAR"))
    if not await has_column("jobs", "user_id"):
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN user_id VARCHAR"))
    if not await has_column("social_accounts", "access_token"):
        await conn.execute(text("ALTER TABLE social_accounts ADD COLUMN access_token TEXT"))
    if not await has_column("social_accounts", "refresh_token"):
        await conn.execute(text("ALTER TABLE social_accounts ADD COLUMN refresh_token TEXT"))
