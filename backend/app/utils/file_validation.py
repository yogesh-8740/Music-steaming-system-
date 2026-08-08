"""
File validation helpers for uploads (songs, cover art, avatars).
"""
from fastapi import UploadFile, HTTPException
from app.core.config import settings

ALLOWED_AUDIO_EXTENSIONS = {"mp3", "wav"}
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def validate_audio_file(file: UploadFile) -> str:
    ext = get_extension(file.filename)
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid audio format '.{ext}'. Allowed: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}",
        )
    return ext


def validate_image_file(file: UploadFile) -> str:
    ext = get_extension(file.filename)
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image format '.{ext}'. Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )
    return ext


def validate_file_size(size_bytes: int) -> None:
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if size_bytes > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB",
        )
