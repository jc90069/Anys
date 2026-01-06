#!/usr/bin/env python3
"""Fast transcription using faster-whisper (CTranslate2 backend)"""

import sys
from faster_whisper import WhisperModel

def transcribe(audio_file: str, model_size: str = "base") -> str:
    """Transcribe audio file and return text."""
    # Use CPU with int8 quantization for speed on Intel Mac
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    segments, _ = model.transcribe(audio_file, language="en", beam_size=1)

    # Join all segments
    text = " ".join(segment.text.strip() for segment in segments)
    return text.strip()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: transcribe.py <audio_file> [model_size]", file=sys.stderr)
        sys.exit(1)

    audio_file = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"

    result = transcribe(audio_file, model_size)
    print(result)
