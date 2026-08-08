"""
Streaming endpoint implementing real HTTP Range Request support so
browsers can seek within audio files and buffer efficiently, exactly
like a real streaming service.

Also demonstrates:
- LRU caching of popular songs (serves from memory when cached).
- Automatic failover: if the song's primary storage node is marked
  offline, attempts to find a replica on another available node folder
  by filename (simulating replicated distributed storage).
- Streaming log entries + play_count increment for analytics.
"""
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.song import Song
from app.models.storage import StorageNode
from app.models.activity import StreamingLog, ListeningHistory
from app.services import storage_manager
from app.services.cache_manager import song_cache
from app.services.ws_manager import manager

router = APIRouter(prefix="/stream", tags=["Streaming"])

CHUNK_SIZE = 1024 * 1024  # 1MB chunks

MIME_TYPES = {"mp3": "audio/mpeg", "wav": "audio/wav"}


def _resolve_file_path(db: Session, song: Song) -> tuple[Path, StorageNode]:
    node = db.query(StorageNode).filter(StorageNode.id == song.storage_node_id).first()

    if node and node.is_online:
        path = storage_manager.get_file_path(node, song.file_name)
        if path.exists():
            return path, node

    # Failover: primary offline or file missing -> try another online node
    # (In this local simulation, files are not literally replicated across
    # folders, so failover here demonstrates the *mechanism* used in a real
    # replicated system: locate an alternate node and check for the file.)
    fallback = storage_manager.find_failover_node(db, exclude_node_id=node.id if node else -1)
    if fallback:
        alt_path = storage_manager.get_file_path(fallback, song.file_name)
        if alt_path.exists():
            return alt_path, fallback

    raise HTTPException(status_code=503, detail="Song file is currently unavailable on all nodes")


@router.get("/{song_id}")
async def stream_song(song_id: int, request: Request, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    file_path, node = _resolve_file_path(db, song)
    file_size = file_path.stat().st_size
    mime_type = MIME_TYPES.get(song.file_format, "application/octet-stream")

    range_header = request.headers.get("range")
    served_from_cache = False

    # Try LRU cache first (only for small enough files kept fully in memory)
    cached_bytes = song_cache.get(song.id)

    def file_iterator(start: int, end: int):
        if cached_bytes is not None:
            yield cached_bytes[start:end + 1]
            return
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = f.read(min(CHUNK_SIZE, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    start = 0
    end = file_size - 1
    status_code = 200
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": mime_type,
    }

    if range_header:
        match = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if match:
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else file_size - 1
            end = min(end, file_size - 1)
            status_code = 206
            headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"

    headers["Content-Length"] = str(end - start + 1)

    # Populate cache with full file bytes if not already cached and file is reasonably small (<15MB)
    if cached_bytes is None and file_size < 15 * 1024 * 1024:
        try:
            with open(file_path, "rb") as f:
                data = f.read()
            song_cache.put(song.id, data)
        except Exception:
            pass
    else:
        served_from_cache = cached_bytes is not None

    # Log the streaming event (only log on initial request, not every range chunk, to avoid log spam)
    if not range_header or start == 0:
        song.play_count += 1
        db.add(StreamingLog(
            song_id=song.id,
            storage_node_id=node.id,
            served_from_cache=served_from_cache,
            bytes_streamed=file_size,
        ))
        db.commit()

        # Broadcast a "routing" pulse to anyone with the Network Map open,
        # so they can literally watch which node serves this stream in
        # real time. This is the flagship demo feature for the panel.
        await manager.broadcast_global({
            "type": "node_activity",
            "node": node.name,
            "song_title": song.title,
            "served_from_cache": served_from_cache,
        })

    return StreamingResponse(
        file_iterator(start, end),
        status_code=status_code,
        headers=headers,
        media_type=mime_type,
    )


@router.post("/{song_id}/log-progress")
def log_listening_progress(song_id: int, progress_seconds: float, db: Session = Depends(get_db),
                            user_id: Optional[int] = None):
    """Records listening history progress. user_id optional to allow anonymous listens."""
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    if user_id:
        db.add(ListeningHistory(user_id=user_id, song_id=song_id, progress_seconds=progress_seconds))
        db.commit()
    return {"message": "Progress logged"}
