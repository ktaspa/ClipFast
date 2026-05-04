import asyncio
import os
import platform
import re

# Hook: drawtext (needs libfreetype). Captions: ass/subtitles (needs libass).
# Homebrew's default `ffmpeg` bottle omits both. We auto-use `ffmpeg-full` if installed (keg-only).
# Override with CLIPFAST_FFMPEG / CLIPFAST_FFPROBE when needed.

# Word captions only in ASS (hook is drawtext, not in ASS).
def _ass_header() -> str:
    font = (os.getenv("CLIPFAST_ASS_FONT") or "").strip() or (
        "Helvetica" if platform.system() == "Darwin" else "DejaVu Sans"
    )
    return f"""\
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,72,72,220,1
Style: Hook,{font},48,&H00FFFFFF,&H000000FF,&H00000000,&H99000000,-1,0,0,0,100,100,2,0,3,0,0,8,30,30,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

OUT_W = 1080
OUT_H = 1920
ZOOM_DEFAULT = 1.15
MAX_CONTENT_HEIGHT_FRAC = 0.72
# Legacy tight-crop layout: 160px top letterbox strip
LEGACY_TOP_PAD = 160
LEGACY_BODY_H = 1600

_filter_known_cache: dict[tuple[str, str], bool] = {}
_ass_vf_name_cache: dict[str, str | None] = {}
_resolved_ffmpeg: str | None = None


def _homebrew_ffmpeg_full_binaries() -> list[str]:
    if platform.system() != "Darwin":
        return []
    paths: list[str] = []
    hp = (os.environ.get("HOMEBREW_PREFIX") or "").strip()
    if hp:
        paths.append(os.path.join(hp, "opt", "ffmpeg-full", "bin", "ffmpeg"))
    paths.extend(
        [
            "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg",
            "/usr/local/opt/ffmpeg-full/bin/ffmpeg",
        ]
    )
    seen: set[str] = set()
    out: list[str] = []
    for p in paths:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def _ffmpeg_executable() -> str:
    global _resolved_ffmpeg
    env = (os.getenv("CLIPFAST_FFMPEG") or "").strip()
    if env:
        return env
    if _resolved_ffmpeg is not None:
        return _resolved_ffmpeg
    for path in _homebrew_ffmpeg_full_binaries():
        if os.path.isfile(path) and os.access(path, os.X_OK):
            _resolved_ffmpeg = path
            return path
    _resolved_ffmpeg = "ffmpeg"
    return _resolved_ffmpeg


def _ffprobe_executable() -> str:
    env = (os.getenv("CLIPFAST_FFPROBE") or "").strip()
    if env:
        return env
    ff = _ffmpeg_executable()
    if ff != "ffmpeg" and ff.endswith("ffmpeg"):
        sibling = ff[: -len("ffmpeg")] + "ffprobe"
        if os.path.isfile(sibling) and os.access(sibling, os.X_OK):
            return sibling
    return "ffprobe"


async def _ffmpeg_has_filter(filter_name: str) -> bool:
    exe = _ffmpeg_executable()
    key = (exe, filter_name)
    if key in _filter_known_cache:
        return _filter_known_cache[key]
    proc = await asyncio.create_subprocess_exec(
        exe,
        "-hide_banner",
        "-h",
        f"filter={filter_name}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    out, err = await proc.communicate()
    blob = (out + err).decode("utf-8", "replace")
    missing = re.search(
        rf"(?i)unknown\s+filter\s+['\"]?{re.escape(filter_name)}['\"]?\s*\.",
        blob,
    )
    _filter_known_cache[key] = not bool(missing)
    return _filter_known_cache[key]


async def _ass_video_filter_name() -> str | None:
    exe = _ffmpeg_executable()
    if exe in _ass_vf_name_cache:
        return _ass_vf_name_cache[exe]
    name: str | None
    if await _ffmpeg_has_filter("ass"):
        name = "ass"
    elif await _ffmpeg_has_filter("subtitles"):
        name = "subtitles"
    else:
        name = None
    _ass_vf_name_cache[exe] = name
    return name


def _stderr_for_ffmpeg_error(stderr: bytes) -> str:
    dec = stderr.decode("utf-8", "replace")
    err_lines = [ln for ln in dec.splitlines() if "error" in ln.lower()]
    if err_lines:
        return "\n".join(err_lines[-12:])
    return dec[-1800:].strip()


def _looks_like_vf_overlay_failure(msg: str) -> bool:
    m = msg.lower()
    return any(
        tok in m
        for tok in (
            "libass",
            "drawtext",
            "freetype",
            "avfiltergraph",
            "no such filter",
            "unknown filter",
            "error parsing filterchain",
            "error parsing a filter",
            "subtitle",
            "fontconfig",
        )
    )


async def _ffprobe_wh(path: str) -> tuple[int, int]:
    path = os.path.abspath(path)
    cmd = [
        _ffprobe_executable(),
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0:s=x",
        path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    out, _ = await proc.communicate()
    if proc.returncode != 0:
        return OUT_W, int(OUT_W * 9 / 16)
    raw = out.decode().strip()
    if "x" not in raw:
        return OUT_W, int(OUT_W * 9 / 16)
    w_s, h_s = raw.split("x", 1)
    return max(1, int(w_s)), max(1, int(h_s))


def _filter_path_ffmpeg(p: str) -> str:
    p = os.path.abspath(p).replace("\\", "/")
    if len(p) > 2 and p[1] == ":":
        return p[0] + r"\:" + p[2:]
    return p.replace(":", r"\:")


def _compute_letterbox_vf(iw: int, ih: int) -> tuple[str, int]:
    """Return (filter, visible video body height in px after pad)."""
    W, H = OUT_W, OUT_H
    max_sh = max(400, int(H * MAX_CONTENT_HEIGHT_FRAC))
    zoom = ZOOM_DEFAULT
    sh: int

    if iw >= ih:
        sh_at_zoom = ih * (W * zoom) / iw
        if sh_at_zoom > max_sh:
            zoom = max(1.04, (max_sh * iw) / (ih * W))
        sw = int(max(2, round(W * zoom)))
        sh = int(max(2, round(ih * sw / iw)))
        if sh > max_sh:
            sh = max_sh
            sw = int(max(2, round(iw * sh / ih)))
        if sw >= W:
            crop_x = max(0, (sw - W) // 2)
            vf = f"scale={sw}:{sh},crop={W}:{sh}:{crop_x}:0,pad={W}:{H}:0:{(H - sh) // 2}:color=black"
        else:
            pad_x = max(0, (W - sw) // 2)
            vf = f"scale={sw}:{sh},pad={W}:{H}:{pad_x}:{(H - sh) // 2}:color=black"
    else:
        sh = min(max_sh, int(round(ih * 1.08)))
        sw = int(max(2, round(iw * sh / ih)))
        if sw > W:
            crop_x = max(0, (sw - W) // 2)
            vf = f"scale={sw}:{sh},crop={W}:{sh}:{crop_x}:0,pad={W}:{H}:0:{(H - sh) // 2}:color=black"
        else:
            pad_x = max(0, (W - sw) // 2)
            vf = f"scale={sw}:{sh},pad={W}:{H}:{pad_x}:{(H - sh) // 2}:color=black"

    return vf, sh


def _legacy_fill_vf() -> str:
    return ",".join(
        [
            "scale=1080:1600:force_original_aspect_ratio=increase",
            "crop=1080:1600",
            f"pad=1080:1920:0:{LEGACY_TOP_PAD}:color=black",
        ]
    )


def _hook_y_for_layout(letterbox: bool, content_sh: int) -> int:
    if letterbox:
        top = (OUT_H - content_sh) // 2
        return max(24, top // 2 - 4)
    return max(24, LEGACY_TOP_PAD // 2 - 6)


def _drawtext_font_clause() -> str:
    ff = os.getenv("CLIPFAST_HOOK_FONTFILE", "").strip()
    if ff and os.path.isfile(ff):
        return f":fontfile={_filter_path_ffmpeg(ff)}"
    if platform.system() == "Darwin":
        return ":font=Helvetica"
    return ":font=DejaVu Sans"


def _ffmpeg_preset() -> str:
    preset = (os.getenv("CLIPFAST_FFMPEG_PRESET") or "faster").strip()
    allowed = {
        "ultrafast",
        "superfast",
        "veryfast",
        "faster",
        "fast",
        "medium",
        "slow",
        "slower",
        "veryslow",
    }
    return preset if preset in allowed else "faster"


def _ffmpeg_crf() -> str:
    raw = (os.getenv("CLIPFAST_FFMPEG_CRF") or "20").strip()
    try:
        value = int(raw)
    except ValueError:
        value = 20
    return str(max(16, min(26, value)))


def _sanitize_hook_line(text: str) -> str:
    t = " ".join(text.split()).strip().upper()
    # Strip ASS override-tag chars and emoji/symbol pictographs from the persistent hook banner.
    t = re.sub(r"[{}\\\n\r]", "", t)
    t = re.sub(r"[\U0001F000-\U0001FAFF\U00002700-\U000027BF\U00002600-\U000026FF]", "", t)
    t = " ".join(t.split()).strip()
    return t[:120] if t else ""


async def create_clip_with_captions(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    words: list[dict],
    hook_text: str | None = None,
    vertical: bool = True,
    *,
    burn_captions: bool = True,
    burn_hook: bool = True,
    letterbox: bool = True,
) -> None:
    """9:16 output; hook + word captions both rendered via ASS."""
    ass_path = output_path.replace(".mp4", ".ass")
    hook_clean = _sanitize_hook_line(hook_text or "") if burn_hook else ""
    has_ass = write_ass_from_words(
        words if burn_captions else [],
        start_time,
        end_time,
        ass_path,
        hook_text=hook_clean or None,
    )

    try:
        await _run_ffmpeg(
            input_path,
            output_path,
            start_time,
            end_time,
            ass_path if has_ass else None,
            vertical,
            letterbox=letterbox,
        )
    except RuntimeError as exc:
        err = str(exc)
        if has_ass and _looks_like_vf_overlay_failure(err):
            print(f"[video_service] text overlay failed; retrying plain video. Detail:\n{err[-1600:]}")
            await _run_ffmpeg(
                input_path, output_path, start_time, end_time, None, vertical, letterbox=letterbox,
            )
        else:
            raise
    finally:
        if has_ass and os.path.exists(ass_path):
            os.remove(ass_path)


async def _run_ffmpeg(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    ass_path: str | None,
    vertical: bool,
    *,
    letterbox: bool = True,
) -> None:
    input_path = os.path.abspath(input_path)
    output_path = os.path.abspath(output_path)
    if ass_path:
        ass_path = os.path.abspath(ass_path)

    duration = end_time - start_time
    filters: list[str] = []

    exe = _ffmpeg_executable()
    if vertical:
        if letterbox:
            iw, ih = await _ffprobe_wh(input_path)
            vf_core, _ = _compute_letterbox_vf(iw, ih)
            filters.append(vf_core)
        else:
            filters.append(_legacy_fill_vf())

        if ass_path:
            vf_ass = await _ass_video_filter_name()
            if vf_ass:
                filters.append(f"{vf_ass}={_filter_path_ffmpeg(ass_path)}")
            else:
                print(
                    f"[video_service] WARNING: {exe!r} has no ass/subtitles filter (needs libass). "
                    "Captions and hook skipped."
                )

    # Input-side seeking: fast O(1) seek instead of O(n) frame decode
    cmd = [exe, "-y", "-ss", str(start_time), "-i", input_path, "-t", str(duration)]
    if filters:
        cmd += ["-vf", ",".join(filters)]
    cmd += [
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", _ffmpeg_preset(),
        "-crf", _ffmpeg_crf(),
        "-profile:v", "high",
        "-g", "60",
        "-keyint_min", "60",
        "-sc_threshold", "0",
        "-c:a", "aac",
        "-b:a", "160k",
        "-movflags", "+faststart",
        output_path,
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {_stderr_for_ffmpeg_error(stderr)}")


def write_ass_static_text(
    caption: str,
    clip_duration: float,
    out_path: str,
    hook_text: str | None = None,
) -> bool:
    cap = caption.strip()
    hook_clean = _sanitize_hook_line(hook_text or "")
    if not cap and not hook_clean:
        return False
    end = max(0.2, float(clip_duration))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(_ass_header())
        if hook_clean:
            f.write(f"Dialogue: 0,{_ass_ts(0.0)},{_ass_ts(end)},Hook,,0,0,0,,{_sanitize_ass(hook_clean)}\n")
        if cap:
            line = _sanitize_ass(_format_caption_line(cap, allow_emoji=True, line_index=0))
            f.write(f"Dialogue: 0,{_ass_ts(0.0)},{_ass_ts(end)},Default,,0,0,0,,{line}\n")
    return True


def write_ass_from_words(
    words: list[dict],
    clip_start: float,
    clip_end: float,
    out_path: str,
    *,
    hook_text: str | None = None,
    include_words: bool = True,
) -> bool:
    return _write_ass(words, clip_start, clip_end, out_path, hook_text=hook_text, include_words=include_words)


async def remix_clip_from_source(
    source_video_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    *,
    words: list[dict] | None = None,
    hook_text: str | None = None,
    caption_override: str | None = None,
    reset_caption: bool = False,
    vertical: bool = True,
    letterbox: bool = True,
    burn_hook: bool = True,
    burn_captions: bool = True,
) -> None:
    duration = end_time - start_time
    if duration <= 0.5:
        raise ValueError("end_time must be greater than start_time")

    ass_path = output_path.replace(".mp4", ".ass")
    has_ass = False
    hook_clean = _sanitize_hook_line(hook_text or "") if burn_hook else ""
    hook_arg = hook_clean or None

    if caption_override is not None:
        if caption_override.strip() == "":
            # Explicit blank override: only render hook if present
            if hook_arg:
                has_ass = write_ass_static_text("", duration, ass_path, hook_text=hook_arg)
        else:
            has_ass = write_ass_static_text(caption_override, duration, ass_path, hook_text=hook_arg)
    elif reset_caption and words:
        has_ass = burn_captions and write_ass_from_words(
            words, start_time, end_time, ass_path, hook_text=hook_arg, include_words=True
        )
    elif words:
        has_ass = burn_captions and write_ass_from_words(
            words, start_time, end_time, ass_path, hook_text=hook_arg, include_words=True
        )
    elif hook_arg:
        has_ass = write_ass_from_words([], start_time, end_time, ass_path, hook_text=hook_arg)

    try:
        await _run_ffmpeg(
            source_video_path, output_path, start_time, end_time,
            ass_path if has_ass else None, vertical, letterbox=letterbox,
        )
    except RuntimeError as exc:
        err = str(exc)
        if has_ass and _looks_like_vf_overlay_failure(err):
            print(f"[video_service] remix: overlay failed; plain video. Detail:\n{err[-1600:]}")
            await _run_ffmpeg(
                source_video_path, output_path, start_time, end_time, None, vertical, letterbox=letterbox,
            )
        else:
            raise
    finally:
        if has_ass and os.path.exists(ass_path):
            os.remove(ass_path)


async def generate_thumbnail(input_path: str, output_path: str, offset: float = 1.0) -> bool:
    cmd = [
        _ffmpeg_executable(),
        "-y",
        "-ss",
        str(offset),
        "-i",
        input_path,
        "-vframes",
        "1",
        "-vf",
        f"scale={OUT_W}:{OUT_H}:force_original_aspect_ratio=decrease,pad={OUT_W}:{OUT_H}:(ow-iw)/2:(oh-ih)/2:color=black",
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


def _pick_emoji(text: str) -> str | None:
    t = text.lower()
    if any(k in t for k in ["secret", "hidden", "nobody", "never told", "truth", "exposed", "leak"]):
        return "🔐"
    if any(k in t for k in ["warning", "mistake", "dont", "don't", "stop", "avoid", "wrong"]):
        return "⚠️"
    if any(k in t for k in ["money", "profit", "rich", "income", "salary", "pricing", "paid", "free"]):
        return "💰"
    if any(k in t for k in ["insane", "crazy", "unbelievable", "wild", "shocking", "mind blown"]):
        return "🤯"
    if any(k in t for k in ["simple", "easy", "quick", "fast", "hack", "shortcut"]):
        return "⚡"
    if any(k in t for k in ["best", "top", "#1", "number one", "win", "winning"]):
        return "🏆"
    if any(k in t for k in ["ai", "gpt", "chatgpt", "model", "algorithm"]):
        return "🤖"
    if any(k in t for k in ["look", "watch", "see this", "notice", "eyes"]):
        return "👀"
    if any(k in t for k in ["growth", "scale", "viral", "views", "subscribe"]):
        return "📈"
    if "hate" in t or "angry" in t:
        return "💢"
    if any(k in t for k in ["love", "heart", "emotion", "feel"]):
        return "❤️"
    if any(k in t for k in ["why", "how", "what if", "question", "wonder"]):
        return "🤔"
    if any(k in t for k in ["learn", "teach", "lesson", "school", "study"]):
        return "📚"
    if any(k in t for k in ["idea", "think", "brain", "realize", "understand"]):
        return "💡"
    if any(k in t for k in ["wait", "hold on", "plot twist", "actually"]):
        return "😳"
    if any(k in t for k in ["today", "now", "right now", "2024", "2025", "2026"]):
        return "⏰"
    if any(k in t for k in ["everyone", "nobody", "people", "they don't"]):
        return "🗣️"
    if any(k in t for k in ["this is", "here's", "the reason", "point is"]):
        return "👉"
    if any(k in t for k in ["burn", "brutal", "hard truth", "reality"]):
        return "💀"
    if any(k in t for k in ["huge", "massive", "big", "insane deal"]):
        return "🔥"
    return None


def _hook_emoji_fallback(line_index: int) -> str:
    return ("🔥", "👀", "⚡", "💡", "🎯", "✨", "📌", "🚀")[line_index % 8]


def _sanitize_ass(text: str) -> str:
    return text.replace("{", "\\{").replace("}", "\\}").strip()


def _chunk_words(words: list[dict]) -> list[list[dict]]:
    groups: list[list[dict]] = []
    current: list[dict] = []
    max_chars = 34
    max_words = 9
    pause_s = 0.45

    def cur_text_len(next_word: str | None = None) -> int:
        base = " ".join(w["text"] for w in current).strip()
        if next_word:
            base = (base + " " + next_word).strip()
        return len(base)

    for w in words:
        if current:
            gap = float(w["start"]) - float(current[-1]["end"])
            if gap >= pause_s:
                groups.append(current)
                current = []

        if current and (len(current) >= max_words or cur_text_len(w["text"]) > max_chars):
            groups.append(current)
            current = []

        current.append(w)

    if current:
        groups.append(current)

    return groups


def _format_caption_line(text: str, allow_emoji: bool, *, line_index: int = 0) -> str:
    text = " ".join(text.split())
    if not text:
        return text

    if text.islower():
        text = text[:1].upper() + text[1:]

    if allow_emoji:
        emoji = _pick_emoji(text)
        if not emoji and len(text) >= 12:
            emoji = _hook_emoji_fallback(line_index)
        if emoji:
            text = f"{emoji} {text}"

    return text


def _write_ass(
    words: list[dict],
    clip_start: float,
    clip_end: float,
    out_path: str,
    *,
    hook_text: str | None = None,
    include_words: bool = True,
) -> bool:
    clip_dur = max(0.01, float(clip_end) - float(clip_start))
    has_hook = bool(hook_text)

    groups: list[list[dict]] = []
    if include_words and words:
        overlapping = [
            w for w in words if float(w["end"]) > clip_start and float(w["start"]) < clip_end
        ]
        normalized: list[dict] = []
        for w in overlapping:
            ws = max(clip_start, float(w["start"]))
            we = min(clip_end, float(w["end"]))
            if we <= ws:
                continue
            normalized.append({"text": w["text"], "start": ws, "end": we})
        groups = _chunk_words(normalized)

    if not groups and not has_hook:
        return False

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(_ass_header())

        if has_hook:
            hook_safe = _sanitize_ass(hook_text)  # type: ignore[arg-type]
            f.write(f"Dialogue: 0,{_ass_ts(0.0)},{_ass_ts(clip_dur)},Hook,,0,0,0,,{hook_safe}\n")

        for grp in groups:
            start = max(0.0, grp[0]["start"] - clip_start)
            end = min(clip_dur, grp[-1]["end"] - clip_start)
            if end <= start:
                continue
            raw_text = " ".join(w["text"] for w in grp)
            line = _format_caption_line(raw_text, allow_emoji=False, line_index=0)
            text = _sanitize_ass(line)
            f.write(f"Dialogue: 0,{_ass_ts(start)},{_ass_ts(end)},Default,,0,0,0,,{text}\n")

    return True
