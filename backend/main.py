from load_env import load_clipfast_dotenv

# Merge .env into os.environ (fills vars that are unset or blank — see load_env.py).
load_clipfast_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import asyncio
import os
import traceback

from database import init_db
from routes import jobs, clips, channels, uploads, socials, activity, billing
from security import rate_limit_middleware, security_headers_middleware
from services import channel_monitor, youtube_health


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("media", exist_ok=True)
    await init_db()
    poll_task = asyncio.create_task(channel_monitor.channel_poll_loop())
    youtube_health_task = asyncio.create_task(youtube_health.health_loop())
    yield
    for task in (poll_task, youtube_health_task):
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="ClipFast API", version="2.0.0", lifespan=lifespan)
app.middleware("http")(rate_limit_middleware)
app.middleware("http")(security_headers_middleware)

_origins_env = os.getenv("ALLOWED_ORIGINS", "")
_origin_list = [o.strip() for o in _origins_env.split(",") if o.strip()]
if _origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        # In dev, Next may run on various ports (3000, 3010, etc). Allow localhost any port.
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.mount("/media", StaticFiles(directory="media"), name="media")

app.include_router(jobs.router, prefix="/api")
app.include_router(clips.router, prefix="/api")
app.include_router(channels.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(socials.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(billing.router, prefix="/api")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Return JSON (with a useful message) instead of a plain 500 body the browser can't parse."""
    traceback.print_exc()
    detail = str(exc) if str(exc) else repr(exc)
    payload: dict = {"detail": detail}
    if os.getenv("CLIPFAST_DEBUG_ERRORS", "").strip().lower() in ("1", "true", "yes"):
        payload["traceback"] = traceback.format_exc()
    return JSONResponse(status_code=500, content=payload)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "ClipFast API",
        "version": "2.0.0",
        "youtube": youtube_health.snapshot(),
    }
