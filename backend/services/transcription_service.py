import assemblyai as aai
import os
import asyncio


def _get_transcriber():
    api_key = os.getenv("ASSEMBLY_AI_API_KEY", "")
    if not api_key:
        raise ValueError("ASSEMBLY_AI_API_KEY is not set")
    aai.settings.api_key = api_key
    return aai.Transcriber()


async def transcribe_video(video_path: str) -> dict:
    """Transcribe via AssemblyAI; returns text + word-level timestamps."""

    def _run():
        transcriber = _get_transcriber()
        config = aai.TranscriptionConfig(
            speech_models=["universal-2"],
            punctuate=True,
            format_text=True,
        )
        transcript = transcriber.transcribe(video_path, config=config)

        if transcript.status == aai.TranscriptStatus.error:
            raise RuntimeError(f"AssemblyAI error: {transcript.error}")

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

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run)
