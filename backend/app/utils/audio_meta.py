"""
Lightweight audio duration estimation without requiring ffmpeg/ffprobe
to be installed on the system (keeps setup friction low for a local
FYP demo). Falls back to 0.0 if the format can't be parsed.

- WAV: parsed via the standard library 'wave' module (exact).
- MP3: estimated from bitrate found in the first frame header
  (approximate but good enough for display purposes).
"""
import wave
import struct
from pathlib import Path


def get_wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            return round(frames / float(rate), 2) if rate else 0.0
    except Exception:
        return 0.0


# Minimal MP3 bitrate table for MPEG1 Layer III (most common case)
_MP3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
_MP3_SAMPLE_RATES = [44100, 48000, 32000, 0]


def get_mp3_duration(path: Path) -> float:
    try:
        file_size = path.stat().st_size
        with open(path, "rb") as f:
            data = f.read(4096)

        # find first frame sync (0xFFE...)
        idx = 0
        while idx < len(data) - 4:
            if data[idx] == 0xFF and (data[idx + 1] & 0xE0) == 0xE0:
                header = struct.unpack(">I", data[idx:idx + 4])[0]
                bitrate_index = (header >> 12) & 0x0F
                sample_rate_index = (header >> 10) & 0x03
                bitrate = _MP3_BITRATES[bitrate_index] if bitrate_index < len(_MP3_BITRATES) else 0
                sample_rate = _MP3_SAMPLE_RATES[sample_rate_index] if sample_rate_index < len(_MP3_SAMPLE_RATES) else 0
                if bitrate and sample_rate:
                    # duration = file_size(bits) / bitrate(bits/sec)
                    duration = (file_size * 8) / (bitrate * 1000)
                    return round(duration, 2)
                break
            idx += 1
        return 0.0
    except Exception:
        return 0.0


def estimate_duration(path: Path, extension: str) -> float:
    if extension == "wav":
        return get_wav_duration(path)
    if extension == "mp3":
        return get_mp3_duration(path)
    return 0.0
