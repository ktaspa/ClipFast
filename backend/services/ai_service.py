from google import genai
import os
import json
import asyncio

_PROMPT = """You are an expert viral content strategist for TikTok, Instagram Reels, and YouTube Shorts.

Analyze the transcript below and identify the 5 BEST moments that would make incredible short-form viral clips.

TRANSCRIPT:
{transcript}

VIDEO DURATION: {duration} seconds

Return ONLY a valid JSON object (no markdown, no explanation) with this structure:
{{
  "clips": [
    {{
      "title": "Catchy social-media title (max 60 chars)",
      "description": "Why this will go viral (1-2 sentences)",
      "start_time": 12.5,
      "end_time": 48.0,
      "viral_score": 8.5
    }}
  ]
}}

Rules:
- Each clip must be 15–90 seconds long
- start_time and end_time are in SECONDS (floats)
- viral_score is 1–10
- Pick moments with strong hooks, emotion, insight, controversy, or surprising facts
- Clips should start on a compelling line, not mid-sentence
"""


async def identify_viral_clips(transcript: str, duration: float) -> list[dict]:
    """Call Gemini to identify top 5 viral moments; returns list of clip dicts."""

    def _run():
        api_key = os.getenv("GOOGLE_API_KEY", "")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set")

        client = genai.Client(api_key=api_key)
        prompt = _PROMPT.format(
            transcript=transcript[:12000],
            duration=round(duration, 1),
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        raw = response.text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.rsplit("```", 1)[0].strip()

        data = json.loads(raw)
        clips_raw = data.get("clips", [])

        validated = []
        for c in clips_raw[:5]:
            start = max(0.0, float(c.get("start_time", 0)))
            end = min(float(duration), float(c.get("end_time", start + 30)))
            if end - start < 5:
                continue
            validated.append(
                {
                    "title": str(c.get("title", f"Clip {len(validated)+1}"))[:60],
                    "description": str(c.get("description", "")),
                    "start_time": round(start, 2),
                    "end_time": round(end, 2),
                    "duration": round(end - start, 2),
                    "viral_score": min(10.0, max(1.0, float(c.get("viral_score", 7.0)))),
                }
            )

        # Fallback: even splits if Gemini returned nothing valid
        if not validated:
            clip_len = min(45.0, duration / 5)
            for i in range(5):
                start = i * (duration / 5)
                end = start + clip_len
                validated.append(
                    {
                        "title": f"Highlight {i + 1}",
                        "description": "Auto-generated highlight",
                        "start_time": round(start, 2),
                        "end_time": round(end, 2),
                        "duration": round(clip_len, 2),
                        "viral_score": 7.0,
                    }
                )

        return validated

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run)
