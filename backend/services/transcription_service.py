import assemblyai as aai
import os
import asyncio

from load_env import load_clipfast_dotenv


def _assembly_api_key() -> str:
    load_clipfast_dotenv()
    for name in (
        "ASSEMBLY_AI_API_KEY",
        "ASSEMBLYAI_API_KEY",
        "ASSEMBLY_API_KEY",
    ):
        v = (os.getenv(name) or "").strip()
        if v and v != "your_assemblyai_key_here":
            return v
    return ""


def _get_transcriber():
    api_key = _assembly_api_key()
    if not api_key:
        raise ValueError(
            "AssemblyAI API key is missing. Add ASSEMBLY_AI_API_KEY to clipfast/.env (repo root), "
            "restart the API, and remove any empty ASSEMBLY_AI_API_KEY entry from your IDE run "
            "configuration (an empty env var blocks loading the value from env)."
        )
    aai.settings.api_key = api_key
    return aai.Transcriber()


def _transcribe_sync(abs_path: str) -> dict:
    """Blocking AssemblyAI call; must receive an absolute, existing file path."""
    transcriber = _get_transcriber()
    # API requires `speech_models` (array); `speech_model` is rejected as deprecated.
    # See https://www.assemblyai.com/docs/pre-recorded-audio/select-the-speech-model
    config = aai.TranscriptionConfig(
        speech_models=["universal-3-pro", "universal-2"],
        punctuate=True,
        format_text=True,
    )
    transcript = transcriber.transcribe(abs_path, config=config)

    if transcript.status == aai.TranscriptStatus.error:
        msg = transcript.error or "unknown error"
        raise RuntimeError(f"AssemblyAI error: {msg}")

    words = []
    for w in transcript.words or []:
        words.append(
            {
                "text": w.text,
                "start": w.start / 1000.0,
                "end": w.end / 1000.0,
            }
        )

    return {"text": transcript.text or "", "words": words}


async def transcribe_video(video_path: str) -> dict:
    """Transcribe via AssemblyAI; returns text + word-level timestamps."""
    abs_path = os.path.abspath(video_path)
    if not os.path.isfile(abs_path):
        raise FileNotFoundError(f"Transcription source missing: {abs_path}")

    return await asyncio.to_thread(_transcribe_sync, abs_path)
