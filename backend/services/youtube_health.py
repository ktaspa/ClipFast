from __future__ import annotations

import asyncio
import os
import time
from dataclasses import dataclass, asdict

from services import youtube_service


DEFAULT_HEALTHCHECK_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
CHECK_INTERVAL_SEC = int(os.getenv("YOUTUBE_HEALTHCHECK_INTERVAL_SEC", "600"))
INITIAL_DELAY_SEC = int(os.getenv("YOUTUBE_HEALTHCHECK_INITIAL_DELAY_SEC", "30"))


@dataclass
class YouTubeHealthState:
    ok: bool = True
    checked_at: float = 0.0
    message: str = "Not checked yet"


state = YouTubeHealthState()


def snapshot() -> dict:
    data = asdict(state)
    data["checked_at"] = int(data["checked_at"])
    return data


async def check_once() -> YouTubeHealthState:
    url = (os.getenv("YOUTUBE_HEALTHCHECK_URL") or DEFAULT_HEALTHCHECK_URL).strip()
    try:
        await youtube_service.probe_video_access(url)
        state.ok = True
        state.message = "YouTube download preflight is healthy"
    except youtube_service.YouTubeDownloadBlocked as exc:
        state.ok = False
        state.message = str(exc)
        print(f"[youtube_health] blocked: {state.message}")
    except Exception as exc:
        state.ok = False
        state.message = f"YouTube health check failed: {exc}"
        print(f"[youtube_health] error: {state.message}")
    state.checked_at = time.time()
    return state


async def health_loop() -> None:
    await asyncio.sleep(INITIAL_DELAY_SEC)
    while True:
        try:
            await check_once()
        except Exception as exc:
            print(f"[youtube_health] loop error: {exc}")
        await asyncio.sleep(CHECK_INTERVAL_SEC)
