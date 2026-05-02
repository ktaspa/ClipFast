import yt_dlp
import os
import asyncio
from pathlib import Path


async def download_video(youtube_url: str, output_dir: str) -> dict:
    """Download video with yt-dlp; returns title, duration, file_path."""

    ydl_opts = {
        "format": "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": os.path.join(output_dir, "video.%(ext)s"),
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }

    def _run():
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            # yt-dlp may write video.mp4 or video.webm etc.
            ext = info.get("ext", "mp4")
            file_path = os.path.join(output_dir, f"video.{ext}")
            # Prefer .mp4 if it was merged
            mp4_path = os.path.join(output_dir, "video.mp4")
            if os.path.exists(mp4_path):
                file_path = mp4_path
            return {
                "title": info.get("title", "Untitled Video"),
                "duration": float(info.get("duration") or 0),
                "file_path": file_path,
            }

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run)
