import yt_dlp
import os
import asyncio
from typing import Optional


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

    cookies_file = os.getenv("YT_COOKIES_FILE", "").strip()

    ydl_opts = {
        "format": "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
        "outtmpl": os.path.join(output_dir, "video.%(ext)s"),
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        # web client with mweb+tv fallback bypasses SABR streaming restrictions
        # that YouTube enforces on datacenter IPs for the web-only client.
        # bgutil-ytdlp-pot-provider handles PO token generation automatically.
        # yt-dlp-ejs + node runtime solves n-challenges.
        "extractor_args": {
            "youtube": {
                "player_client": ["web", "mweb", "tv"],
            }
        },
        # Use Node.js via yt-dlp-ejs for n-challenge solving.
        # Python API requires dict format; "node" key with empty config uses defaults.
        "js_runtimes": {"node": {}},
        **({"cookiefile": cookies_file} if cookies_file else {}),
    }

    def _run():
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
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

    return await asyncio.to_thread(_run)
