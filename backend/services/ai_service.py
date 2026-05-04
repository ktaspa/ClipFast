from google import genai
import os
import json
import asyncio
import time

from load_env import load_clipfast_dotenv

_PROMPT_TEMPLATE = """You are a senior short-form video editor for TikTok, Instagram Reels, and YouTube Shorts.

Analyze the transcript below and identify the {max_clips} strongest, least generic moments. Optimize for clips a viewer would finish, share, or comment on.

TRANSCRIPT:
{transcript}

VIDEO DURATION: {duration} seconds

Return ONLY a valid JSON object (no markdown, no explanation) with this structure:
{{
  "clips": [
    {{
      "title": "Catchy social-media title (max 60 chars)",
      "hook": "ONE punchy line for a top-of-frame banner. ALL CAPS, 3–6 words, max 42 chars. NO EMOJI. Write a scroll-stopping headline unique to this exact moment. Examples: 'THIS COSTS PEOPLE MONEY', 'THE PART NOBODY SAYS', 'WAIT FOR THE PAYOFF', 'STOP MAKING THIS MISTAKE', 'THE REAL REASON WHY'",
      "description": "Why this will go viral (1-2 sentences)",
      "start_time": 12.5,
      "end_time": 48.0,
      "viral_score": 8.5
    }}
  ]
}}

Rules:
- Return up to {max_clips} clips in the "clips" array
- Each clip must be {clip_min}–{clip_max} seconds long (inclusive)
- start_time and end_time are in SECONDS (floats)
- viral_score is 1–10
- Pick complete micro-stories: setup, payoff, and a clear reason to keep watching
- Prioritize tension, strong opinion, contrarian insight, personal stakes, named specifics, surprising numbers, mistakes, transformations, or emotionally charged moments
- Avoid generic summaries, intros, sponsor reads, housekeeping, greetings, and clips that only make sense with missing context
- Start on a strong sentence boundary within 1 second of the stated start_time
- End immediately after the payoff; do not trail into the next topic
- hook is burned into the top of the clip for the full duration: ALL CAPS, no emoji, ultra-short, punchy, unique to this clip
"""


async def identify_viral_clips(
    transcript: str,
    duration: float,
    *,
    words: list[dict] | None = None,
    clip_min_s: float = 15,
    clip_max_s: float = 90,
    max_clips: int = 5,
) -> list[dict]:
    """Call Gemini to identify viral moments; returns list of clip dicts."""

    clip_min_s = max(5.0, min(120.0, float(clip_min_s)))
    clip_max_s = max(clip_min_s, min(180.0, float(clip_max_s)))
    max_clips = max(1, min(5, int(max_clips)))
    clip_min_i = int(round(clip_min_s))
    clip_max_i = int(round(clip_max_s))

    def _word_time(w: dict, key: str) -> float | None:
        val = w.get(key)
        if val is None:
            return None
        try:
            f = float(val)
        except (TypeError, ValueError):
            return None
        return f / 1000.0 if f > duration + 5 else f

    def _transcript_for_prompt() -> str:
        if not words:
            return transcript[:14000]
        chunks: list[str] = []
        buf: list[str] = []
        chunk_start: float | None = None
        last_end = 0.0
        for w in words:
            text = str(w.get("text") or w.get("word") or "").strip()
            if not text:
                continue
            st = _word_time(w, "start")
            en = _word_time(w, "end")
            if st is None:
                st = last_end
            if en is None:
                en = st
            if chunk_start is None:
                chunk_start = st
            buf.append(text)
            last_end = en
            joined = " ".join(buf)
            sentence_end = text.endswith((".", "?", "!"))
            if sentence_end or len(joined) > 240:
                chunks.append(f"[{chunk_start:.1f}-{last_end:.1f}] {joined}")
                buf = []
                chunk_start = None
            if len("\n".join(chunks)) > 15500:
                break
        if buf and chunk_start is not None:
            chunks.append(f"[{chunk_start:.1f}-{last_end:.1f}] {' '.join(buf)}")
        return "\n".join(chunks)[:16000] or transcript[:14000]

    def _snap_to_word_boundary(start: float, end: float) -> tuple[float, float]:
        if not words:
            return start, end
        starts: list[float] = []
        ends: list[float] = []
        for w in words:
            st = _word_time(w, "start")
            en = _word_time(w, "end")
            if st is not None:
                starts.append(st)
            if en is not None:
                ends.append(en)
        if not starts:
            return start, end
        near_starts = [s for s in starts if abs(s - start) <= 1.5]
        if near_starts:
            start = min(near_starts, key=lambda x: abs(x - start))
        near_ends = [e for e in ends if abs(e - end) <= 1.5]
        if near_ends:
            end = min(near_ends, key=lambda x: abs(x - end))
        return max(0.0, start), min(duration, max(start + 1.0, end))

    def _specificity_score(c: dict) -> float:
        text = " ".join([str(c.get("title", "")), str(c.get("hook", "")), str(c.get("description", ""))]).lower()
        generic = ["watch this", "must watch", "this is crazy", "this changes everything", "nobody talks about this"]
        penalty = 1.0 if any(g in text for g in generic) else 0.0
        bonus = 0.0
        if any(ch.isdigit() for ch in text):
            bonus += 0.35
        if any(k in text for k in ["mistake", "secret", "why", "how", "truth", "cost", "money", "never", "stop"]):
            bonus += 0.25
        return bonus - penalty

    def _run():
        load_clipfast_dotenv()
        api_key = (os.getenv("GOOGLE_API_KEY") or "").strip()
        if not api_key or api_key == "your_google_gemini_key_here":
            raise ValueError("GOOGLE_API_KEY is not set")

        client = genai.Client(api_key=api_key)
        prompt = _PROMPT_TEMPLATE.format(
            transcript=_transcript_for_prompt(),
            duration=round(duration, 1),
            max_clips=max_clips,
            clip_min=clip_min_i,
            clip_max=clip_max_i,
        )
        # Try 2.5 Pro; if unavailable (503) fall back to 1.5 Pro — both are Pro-tier quality
        models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-pro"]
        last_err: Exception | None = None
        raw = ""
        for i, model in enumerate(models):
            for attempt in range(2):
                try:
                    response = client.models.generate_content(model=model, contents=prompt)
                    raw = response.text.strip()
                    if i > 0:
                        print(f"[ai_service] using fallback model {model}")
                    break
                except Exception as e:
                    last_err = e
                    if attempt == 0:
                        print(f"[ai_service] {model} failed: {e}; retrying in 10s")
                        time.sleep(10)
            else:
                continue  # both attempts failed, try next model
            break  # success
        else:
            raise last_err  # type: ignore[misc]

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.rsplit("```", 1)[0].strip()

        data = json.loads(raw)
        clips_raw = data.get("clips", [])

        validated = []
        for c in clips_raw[: max_clips * 2]:
            start = max(0.0, float(c.get("start_time", 0)))
            end = min(float(duration), float(c.get("end_time", start + 30)))
            start, end = _snap_to_word_boundary(start, end)
            span = end - start
            if span < clip_min_s:
                continue
            if span > clip_max_s:
                end = start + clip_max_s
                if end > duration:
                    start = max(0.0, duration - clip_max_s)
                    end = duration
            if end - start < clip_min_s * 0.85:
                continue
            validated.append(
                {
                    "title": str(c.get("title", f"Clip {len(validated)+1}"))[:60],
                    "hook": str(c.get("hook", "")).strip()[:48],
                    "description": str(c.get("description", "")),
                    "start_time": round(start, 2),
                    "end_time": round(end, 2),
                    "duration": round(end - start, 2),
                    "viral_score": min(10.0, max(1.0, float(c.get("viral_score", 7.0)) + _specificity_score(c))),
                }
            )

        validated.sort(key=lambda c: c["viral_score"], reverse=True)

        if not validated:
            n = max_clips
            seg = duration / n if n else duration
            clip_target = min(clip_max_s, max(clip_min_s, min(seg, clip_max_s)))
            for i in range(n):
                start = i * (duration / n) if n else 0
                end = min(duration, start + clip_target)
                if end - start < max(5.0, clip_min_s * 0.75):
                    end = min(duration, start + clip_min_s)
                if end <= start:
                    continue
                validated.append(
                    {
                        "title": f"Highlight {len(validated) + 1}",
                        "hook": "WATCH THIS",
                        "description": "Auto-generated highlight",
                        "start_time": round(start, 2),
                        "end_time": round(end, 2),
                        "duration": round(end - start, 2),
                        "viral_score": 7.0,
                    }
                )

        return validated[:max_clips]

    return await asyncio.to_thread(_run)
