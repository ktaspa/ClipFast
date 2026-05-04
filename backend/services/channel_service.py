import asyncio
import re
import urllib.error
import urllib.request
from typing import Optional

_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def parse_channel_handle(url: str) -> Optional[str]:
    patterns = [
        r"youtube\.com/@([^/?&\s]+)",
        r"youtube\.com/c/([^/?&\s]+)",
        r"youtube\.com/channel/([^/?&\s]+)",
        r"youtube\.com/user/([^/?&\s]+)",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


def _to_videos_url(channel_url: str) -> str:
    url = channel_url.strip().rstrip("/")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    if "/videos" not in url:
        url += "/videos"
    return url


_YTIMG_SIZE_RE = re.compile(r"=s(\d{2,4})(?:-[a-z0-9\-]*)?(?:/|$)", re.IGNORECASE)


def _ytimg_stated_size(url: str) -> Optional[int]:
    m = _YTIMG_SIZE_RE.search(url)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def _url_looks_like_banner(url: str, thumb: Optional[dict] = None) -> bool:
    u = url.lower()
    if "banner" in u or "channel_banner" in u:
        return True
    w = int((thumb or {}).get("width") or 0)
    h = int((thumb or {}).get("height") or 0)
    if w and h and w >= h * 1.75:
        return True
    # Huge CDN sizes are usually hero/banner art; square avatars can be =s800+.
    s = _ytimg_stated_size(url)
    if s is not None and s >= 1600:
        return True
    return False


def _best_thumbnail_url(info: dict) -> Optional[str]:
    """Pick a channel *avatar* URL (avoid wide channel banner art)."""
    thumbs: list[dict] = list(info.get("thumbnails") or [])

    def score(t: dict) -> tuple:
        tid = str(t.get("id") or "").lower()
        url = str(t.get("url") or "").lower()
        w = int(t.get("width") or 0)
        h = int(t.get("height") or 0)
        area = w * h

        # Hard reject obvious banner assets
        if "banner" in tid or "banner" in url:
            return (-10_000_000, area)
        if w and h and w >= h * 2.2:  # banners / hero art
            return (-5_000_000, area)

        bonus = 0
        s = _ytimg_stated_size(url)
        if s is not None:
            if 48 <= s <= 320:
                bonus += 3_000_000
            elif s >= 1600:
                bonus -= 4_000_000

        # Strongly prefer avatar-like thumbnails
        if "avatar" in tid:
            return (5_000_000 + bonus, area)
        if "yt3" in url or "ggpht.com" in url:
            return (2_000_000 + bonus, area)

        # Prefer square-ish portraits when dimensions exist
        if w and h:
            ratio = w / max(h, 1)
            squareness = -abs(ratio - 1.0)  # closer to 1 is better
            return (1_000_000 + squareness * 1_000_000 + bonus, area)

        return (0 + bonus, area)

    if thumbs:
        thumbs_sorted = sorted(thumbs, key=score, reverse=True)
        for t in thumbs_sorted:
            u = t.get("url")
            if u and not _url_looks_like_banner(u, t):
                return u

    for key in (
        "uploader_thumbnail",
        "channel_thumbnail",
        "thumbnail",
        "thumbnails",
    ):
        v = info.get(key)
        if isinstance(v, str) and v.startswith("http") and not _url_looks_like_banner(v):
            return v
    return None


def _normalize_channel_url(channel_url: str) -> str:
    url = channel_url.strip().rstrip("/")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def _channel_base_url(channel_url: str) -> str:
    base = _normalize_channel_url(channel_url)
    for suf in ("/videos", "/shorts", "/streams", "/playlists", "/community", "/featured", "/about"):
        if base.endswith(suf):
            base = base[: -len(suf)]
    return base.rstrip("/")


def _http_get(url: str) -> Optional[str]:
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": _USER_AGENT,
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        with urllib.request.urlopen(req, timeout=22) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, OSError, ValueError):
        return None


def _parse_avatar_from_youtube_html(html: str) -> Optional[str]:
    """
    YouTube embeds channel avatar URLs in page JSON (yt-dlp often surfaces banner art instead).
    """
    raw = html.replace("\\/", "/")
    key_variants = ('"avatar":{"thumbnails"', '"avatar": {"thumbnails"', '"avatar":{ "thumbnails"')
    idx = -1
    for k in key_variants:
        idx = raw.find(k)
        if idx != -1:
            break
    if idx == -1:
        return None
    snippet = raw[idx : idx + 16000]
    urls = re.findall(
        r"https://yt3\.(?:ggpht\.com|googleusercontent\.com)[^\s\"'\\<>]+",
        snippet,
    )
    best: Optional[str] = None
    best_score = -10_000_000
    for u in urls:
        u = u.rstrip(",;)")
        if _url_looks_like_banner(u):
            continue
        s = _ytimg_stated_size(u)
        score = 0
        if s is not None:
            if 48 <= s <= 360:
                score = 2_000_000 - abs(s - 176)
            elif s < 48:
                score = 500_000
            else:
                score = 200_000 - min(s, 2000)
        else:
            score = 800_000
        if "no-rj" in u or "-c-k-c" in u:
            score += 150_000
        if score > best_score:
            best_score = score
            best = u
    return best


def _avatar_from_channel_html(channel_url: str) -> Optional[str]:
    base = _channel_base_url(channel_url)
    for page in (base, f"{base}/about", f"{base}/videos"):
        html = _http_get(page)
        if not html:
            continue
        found = _parse_avatar_from_youtube_html(html)
        if found:
            return found
    return None


def _metadata_probe_urls(channel_url: str) -> list[str]:
    """
    Prefer `/about` first: it's usually smaller/faster than tab pages and includes the avatar.
    """
    base = _normalize_channel_url(channel_url)
    # Strip common tab suffixes back to the canonical channel URL.
    for suf in ("/videos", "/shorts", "/streams", "/playlists", "/community", "/featured"):
        if base.endswith(suf):
            base = base[: -len(suf)]

    urls = []
    for u in (f"{base}/about", base, f"{base}/videos"):
        if u not in urls:
            urls.append(u)
    return urls


def _extract_channel_info(url: str) -> Optional[dict]:
    import yt_dlp

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        # Faster metadata-only extraction for channel pages
        "extract_flat": True,
        "playlist_items": "0",
        "ignoreerrors": True,
        "noplaylist": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=False)


async def fetch_channel_metadata(channel_url: str) -> dict:
    """Resolve channel display name + avatar without relying on playlist thumbnails."""

    def _run() -> dict:
        last_info: Optional[dict] = None
        for url in _metadata_probe_urls(channel_url):
            info = _extract_channel_info(url)
            if not info:
                continue
            last_info = info
            channel_name = (
                info.get("channel")
                or info.get("uploader")
                or info.get("title")
            )
            channel_thumbnail = _best_thumbnail_url(info)
            if channel_thumbnail and not _url_looks_like_banner(channel_thumbnail):
                return {"channel_name": channel_name, "channel_thumbnail": channel_thumbnail}
            if channel_thumbnail:
                html_avatar = _avatar_from_channel_html(channel_url)
                return {
                    "channel_name": channel_name,
                    "channel_thumbnail": html_avatar or channel_thumbnail,
                }
            html_avatar = _avatar_from_channel_html(channel_url)
            if html_avatar:
                return {"channel_name": channel_name, "channel_thumbnail": html_avatar}

        if not last_info:
            html_avatar = _avatar_from_channel_html(channel_url)
            return {
                "channel_name": None,
                "channel_thumbnail": html_avatar,
            }
        return {
            "channel_name": last_info.get("channel")
            or last_info.get("uploader")
            or last_info.get("title"),
            "channel_thumbnail": _avatar_from_channel_html(channel_url)
            or _best_thumbnail_url(last_info),
        }

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run)


async def fetch_channel_videos(channel_url: str, max_videos: int = 10) -> dict:
    """Fetch recent video metadata from a YouTube channel via yt-dlp."""

    def _run() -> dict:
        import yt_dlp

        playlist_url = _to_videos_url(channel_url)
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": "in_playlist",
            "playlistend": max_videos,
            "ignoreerrors": True,
            "skip_download": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(playlist_url, download=False)
            if not info:
                return {"channel_name": None, "channel_thumbnail": None, "videos": []}

            channel_name = (
                info.get("channel")
                or info.get("uploader")
                or info.get("title")
            )
            channel_thumbnail = _best_thumbnail_url(info)

            videos = []
            for entry in info.get("entries") or []:
                if not entry:
                    continue
                vid_id = entry.get("id")
                if not vid_id:
                    continue
                videos.append({
                    "id": vid_id,
                    "url": f"https://www.youtube.com/watch?v={vid_id}",
                    "title": entry.get("title") or "",
                    "thumbnail_url": (
                        entry.get("thumbnail")
                        or f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"
                    ),
                })

            return {
                "channel_name": channel_name,
                "channel_thumbnail": channel_thumbnail,
                "videos": videos,
            }

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run)
