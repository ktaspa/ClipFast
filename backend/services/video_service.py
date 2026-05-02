import asyncio
import os
import shutil

# ASS subtitle header — styles baked in so no force_style escaping needed
_ASS_HEADER = """\
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,10,10,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


async def create_clip_with_captions(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    words: list[dict],
    vertical: bool = True,
) -> None:
    """Cut, reframe to 9:16, and burn captions (falls back to no-caption if libass missing)."""
    ass_path = output_path.replace(".mp4", ".ass")
    has_subs = bool(words) and _write_ass(words, start_time, end_time, ass_path)

    try:
        await _run_ffmpeg(input_path, output_path, start_time, end_time, ass_path if has_subs else None, vertical)
    except RuntimeError as exc:
        # libass not compiled in — retry without captions
        if has_subs and ("ass" in str(exc).lower() or "AVFilterGraph" in str(exc) or "No such filter" in str(exc)):
            print("[video_service] libass not available; skipping captions")
            await _run_ffmpeg(input_path, output_path, start_time, end_time, None, vertical)
        else:
            raise
    finally:
        if has_subs and os.path.exists(ass_path):
            os.remove(ass_path)


async def _run_ffmpeg(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    ass_path: str | None,
    vertical: bool,
) -> None:
    duration = end_time - start_time
    filters: list[str] = []

    if vertical:
        filters.append(
            "crop=if(gt(iw\\,ih*9/16)\\,ih*9/16\\,iw):"
            "if(gt(iw\\,ih*9/16)\\,ih\\,iw*16/9):"
            "(iw-if(gt(iw\\,ih*9/16)\\,ih*9/16\\,iw))/2:"
            "(ih-if(gt(iw\\,ih*9/16)\\,ih\\,iw*16/9))/2"
        )
        filters.append("scale=1080:1920:force_original_aspect_ratio=decrease")
        filters.append("pad=1080:1920:(1080-iw)/2:(1920-ih)/2:color=black")

    if ass_path:
        escaped = ass_path.replace("\\", "\\\\").replace(":", "\\:")
        filters.append(f"ass={escaped}")

    cmd = ["ffmpeg", "-y", "-ss", str(start_time), "-i", input_path, "-t", str(duration)]
    if filters:
        cmd += ["-vf", ",".join(filters)]
    cmd += ["-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output_path]

    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {stderr.decode()[-1500:]}")


async def generate_thumbnail(input_path: str, output_path: str, offset: float = 1.0) -> bool:
    cmd = [
        "ffmpeg", "-y", "-ss", str(offset), "-i", input_path, "-vframes", "1",
        "-vf", "scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(540-iw)/2:(960-ih)/2:color=black",
        output_path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    await proc.communicate()
    return proc.returncode == 0


def _ass_ts(secs: float) -> str:
    secs = max(0.0, secs)
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = int(secs % 60)
    cs = int(round((secs % 1) * 100))
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _write_ass(words: list[dict], clip_start: float, clip_end: float, out_path: str) -> bool:
    in_range = [w for w in words if w["start"] >= clip_start and w["end"] <= clip_end + 0.5]
    if not in_range:
        return False

    groups: list[list[dict]] = []
    current: list[dict] = []
    for w in in_range:
        current.append(w)
        if len(current) >= 6:
            groups.append(current)
            current = []
    if current:
        groups.append(current)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(_ASS_HEADER)
        for grp in groups:
            start = grp[0]["start"] - clip_start
            end = grp[-1]["end"] - clip_start
            text = " ".join(w["text"] for w in grp).replace("{", "\\{").replace("}", "\\}")
            f.write(f"Dialogue: 0,{_ass_ts(start)},{_ass_ts(end)},Default,,0,0,0,,{text}\n")

    return True
