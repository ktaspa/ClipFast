import yt_dlp
import os
import asyncio
import tempfile
from typing import Optional
from yt_dlp.utils import DownloadError


class YouTubeDownloadBlocked(RuntimeError):
    """Raised when YouTube blocks yt-dlp before a source video can be downloaded."""


_BLOCKED_MARKERS = (
    "sign in to confirm",
    "not a bot",
    "cookies are no longer valid",
    "cookies for the authentication",
    "confirm you're not a bot",
    "confirm you’re not a bot",
)

_CLIENT_ORDERS = [
    ["web", "mweb", "tv"],
    ["ios", "android"],
    ["web_safari"],
    ["web_embedded"],
]


class _YtDlpLogger:
    def debug(self, msg: str) -> None:
        return None

    def warning(self, msg: str) -> None:
        if "cookies are no longer valid" in msg.lower():
            print("[youtube_service] YouTube cookies are expired or invalid")

    def error(self, msg: str) -> None:
        if any(marker in msg.lower() for marker in _BLOCKED_MARKERS):
            print("[youtube_service] YouTube blocked download; cookies need refresh")
        else:
            print(f"[youtube_service] yt-dlp error: {msg}")


def _best_thumbnail(info: dict) -> Optional[str]:
    thumbs = info.get("thumbnails") or []
    if thumbs:
        best = max(
            thumbs,
            key=lambda t: (t.get("height") or 0) * (t.get("width") or 0),
        )
        u = best.get("url")
        if u:
            return u
    for key in ("thumbnail", "uploader_thumbnail", "channel_thumbnail"):
        v = info.get(key)
        if isinstance(v, str) and v.startswith("http"):
            return v
    return None


async def download_video(youtube_url: str, output_dir: str) -> dict:
    """Download video with yt-dlp; returns title, duration, file_path (absolute)."""

    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    info = await _extract_video_info(youtube_url, output_dir, download=True)

    ext = info.get("ext", "mp4")
    file_path = os.path.join(output_dir, f"video.{ext}")
    # Prefer .mp4 if formats were merged
    mp4_path = os.path.join(output_dir, "video.mp4")
    if os.path.exists(mp4_path):
        file_path = mp4_path
    file_path = os.path.abspath(file_path)
    if not os.path.isfile(file_path):
        raise FileNotFoundError(
            f"Download finished but video file missing: {file_path}"
        )
    return {
        "title": info.get("title", "Untitled Video"),
        "duration": float(info.get("duration") or 0),
        "file_path": file_path,
        "thumbnail_url": _best_thumbnail(info),
    }


async def probe_video_access(youtube_url: str) -> dict:
    """Preflight a YouTube URL without downloading media."""
    with tempfile.TemporaryDirectory(prefix="clipfast-youtube-probe-") as td:
        info = await _extract_video_info(youtube_url, td, download=False)
    return {
        "title": info.get("title", "Untitled Video"),
        "duration": float(info.get("duration") or 0),
        "thumbnail_url": _best_thumbnail(info),
    }


async def _extract_video_info(youtube_url: str, output_dir: str, *, download: bool) -> dict:
    cookies_file = os.getenv("YT_COOKIES_FILE", "").strip()
    if cookies_file:
        cookies_file = os.path.abspath(cookies_file)
        if not os.path.isfile(cookies_file):
            cookies_file = ""
    proxy_url = (os.getenv("YT_DLP_PROXY_URL") or os.getenv("YTDLP_PROXY_URL") or "").strip()

    def _ydl_opts(player_clients: list[str]) -> dict:
        return {
            "format": "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
            "outtmpl": os.path.join(output_dir, "video.%(ext)s"),
            "merge_output_format": "mp4",
            "skip_download": not download,
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "retries": 3,
            "fragment_retries": 3,
            "extractor_retries": 2,
            "socket_timeout": 25,
            "logger": _YtDlpLogger(),
            **({"proxy": proxy_url} if proxy_url else {}),
            # web with mweb/tv first is fastest in the normal case; the later
            # orders are only tried when YouTube blocks extraction before download.
            "extractor_args": {"youtube": {"player_client": player_clients}},
            # Use Node.js via yt-dlp-ejs for n-challenge solving.
            "js_runtimes": {"node": {}},
            **({"cookiefile": cookies_file} if cookies_file else {}),
        }

    def _blocked_error(exc: Exception) -> bool:
        msg = str(exc).lower()
        return any(marker in msg for marker in _BLOCKED_MARKERS)

    def _blocked_message() -> str:
        if cookies_file:
            return (
                "YouTube blocked the download because the server cookies are expired or invalid. "
                "Refresh /opt/clixfair/cookies.txt from a logged-in YouTube browser session, then retry the job. "
                "No clip credits were used for this failed attempt."
            )
        return (
            "YouTube blocked the download and no server cookies file is configured. "
            "Add a valid cookies.txt and set YT_COOKIES_FILE so ClixFair can download this video. "
            "No clip credits were used for this failed attempt."
        )

    def _run():
        last_blocked: Exception | None = None
        for player_clients in _CLIENT_ORDERS:
            try:
                with yt_dlp.YoutubeDL(_ydl_opts(player_clients)) as ydl:
                    info = ydl.extract_info(youtube_url, download=download)
                if not info:
                    raise RuntimeError("yt-dlp returned no video metadata")
                return info
            except DownloadError as exc:
                if _blocked_error(exc):
                    last_blocked = exc
                    continue
                raise
        raise YouTubeDownloadBlocked(_blocked_message()) from last_blocked

    return await asyncio.to_thread(_run)
