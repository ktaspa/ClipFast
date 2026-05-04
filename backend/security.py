from __future__ import annotations

import hashlib
import os
import time
from collections import defaultdict, deque
from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import JSONResponse


class SlidingWindowRateLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = max(1, int(limit))
        self.window_seconds = max(1, int(window_seconds))
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> tuple[bool, int]:
        now = time.monotonic()
        bucket = self._hits[key]
        cutoff = now - self.window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= self.limit:
            retry_after = max(1, int(self.window_seconds - (now - bucket[0])))
            return False, retry_after
        bucket.append(now)
        return True, 0


_ip_limiter = SlidingWindowRateLimiter(
    int(os.getenv("CLIPFAST_RATE_LIMIT_IP_PER_MINUTE", "120")),
    60,
)
_user_limiter = SlidingWindowRateLimiter(
    int(os.getenv("CLIPFAST_RATE_LIMIT_USER_PER_MINUTE", "240")),
    60,
)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip() or "unknown"
    return request.client.host if request.client else "unknown"


def _auth_bucket(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    if not token:
        return None
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:32]


async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    if not (path.startswith("/api/") or path == "/health"):
        return await call_next(request)

    checks = [("ip", _client_ip(request), _ip_limiter)]
    user_key = _auth_bucket(request)
    if user_key:
        checks.append(("user", user_key, _user_limiter))

    for _kind, key, limiter in checks:
        ok, retry_after = limiter.check(key)
        if not ok:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again shortly."},
                headers={"Retry-After": str(retry_after)},
            )

    return await call_next(request)


async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


def sanitize_text(value: str, *, max_len: int) -> str:
    cleaned = " ".join(value.replace("\x00", "").split()).strip()
    return cleaned[:max_len]


def validate_http_url(value: str, *, max_len: int = 2048) -> str:
    cleaned = sanitize_text(value, max_len=max_len)
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("URL must start with http:// or https://")
    return cleaned


def validate_youtube_url(value: str) -> str:
    cleaned = validate_http_url(value, max_len=2048)
    host = (urlparse(cleaned).hostname or "").lower()
    allowed = (
        host == "youtu.be"
        or host == "youtube.com"
        or host.endswith(".youtube.com")
        or host == "youtube-nocookie.com"
        or host.endswith(".youtube-nocookie.com")
    )
    if not allowed:
        raise ValueError("URL must be a YouTube link")
    return cleaned
