import uuid
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.deps import get_current_user, require_uploader
from app.core.config import settings
from app.models.user import User
from app.models.song import Song
from app.models.storage import StorageNode
from app.schemas.song import SongOut, SongDetailOut, SongUpdate
from app.utils.file_validation import validate_audio_file, validate_image_file, validate_file_size
from app.utils.audio_meta import estimate_duration
from app.services import storage_manager

router = APIRouter(prefix="/songs", tags=["Songs"])


@router.post("/upload", response_model=SongOut, status_code=201)
async def upload_song(
    title: str = Form(...),
    genre_id: Optional[int] = Form(None),
    album_id: Optional[int] = Form(None),
    audio_file: UploadFile = File(...),
    cover_art: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_uploader),
):
    ext = validate_audio_file(audio_file)
    contents = await audio_file.read()
    validate_file_size(len(contents))

    # Select a storage node via the configured load balancing algorithm
    node = storage_manager.select_node(db)
    if not node:
        raise HTTPException(status_code=503, detail="No storage nodes available")

    unique_filename = f"song_{uuid.uuid4().hex}.{ext}"
    dest_path = Path(node.folder_path) / unique_filename
    with open(dest_path, "wb") as f:
        f.write(contents)

    file_size_mb = round(len(contents) / (1024 * 1024), 3)
    duration = estimate_duration(dest_path, ext)
    storage_manager.update_node_stats_after_upload(db, node, file_size_mb)

    cover_path_str = None
    if cover_art:
        img_ext = validate_image_file(cover_art)
        img_contents = await cover_art.read()
        validate_file_size(len(img_contents))
        covers_dir = settings.uploads_abs_path / "covers"
        covers_dir.mkdir(parents=True, exist_ok=True)
        cover_filename = f"cover_{uuid.uuid4().hex[:8]}.{img_ext}"
        with open(covers_dir / cover_filename, "wb") as f:
            f.write(img_contents)
        cover_path_str = f"covers/{cover_filename}"

    song = Song(
        title=title,
        artist_id=current_user.id,
        album_id=album_id,
        genre_id=genre_id,
        file_name=unique_filename,
        file_format=ext,
        file_size_mb=file_size_mb,
        duration_seconds=duration,
        storage_node_id=node.id,
        cover_art_path=cover_path_str,
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    return song


@router.get("", response_model=List[SongDetailOut])
def list_songs(
    q: Optional[str] = Query(None, description="Search by title/artist/album"),
    genre_id: Optional[int] = None,
    sort_by: str = Query("newest", description="newest | popularity | most_played"),
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(Song)

    if q:
        like = f"%{q}%"
        query = query.join(User, Song.artist_id == User.id).filter(
            or_(Song.title.ilike(like), User.username.ilike(like))
        )
    if genre_id:
        query = query.filter(Song.genre_id == genre_id)

    if sort_by == "popularity":
        query = query.order_by(Song.like_count.desc())
    elif sort_by == "most_played":
        query = query.order_by(Song.play_count.desc())
    else:
        query = query.order_by(Song.created_at.desc())

    songs = query.offset(offset).limit(limit).all()

    results = []
    for s in songs:
        item = SongDetailOut.model_validate(s)
        item.artist_username = s.artist.username if s.artist else None
        item.genre_name = s.genre.name if s.genre else None
        item.album_title = s.album.title if s.album else None
        item.storage_node_name = s.storage_node.name if s.storage_node else None
        results.append(item)
    return results


@router.get("/{song_id}", response_model=SongDetailOut)
def get_song(song_id: int, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    item = SongDetailOut.model_validate(song)
    item.artist_username = song.artist.username if song.artist else None
    item.genre_name = song.genre.name if song.genre else None
    item.album_title = song.album.title if song.album else None
    item.storage_node_name = song.storage_node.name if song.storage_node else None
    return item


@router.put("/{song_id}", response_model=SongOut)
def update_song(song_id: int, payload: SongUpdate, db: Session = Depends(get_db),
                 current_user: User = Depends(require_uploader)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    if song.artist_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this song")

    if payload.title is not None:
        song.title = payload.title
    if payload.genre_id is not None:
        song.genre_id = payload.genre_id
    if payload.album_id is not None:
        song.album_id = payload.album_id
    db.commit()
    db.refresh(song)
    return song


@router.delete("/{song_id}")
def delete_song(song_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(require_uploader)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    if song.artist_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this song")

    node = db.query(StorageNode).filter(StorageNode.id == song.storage_node_id).first()
    if node:
        storage_manager.delete_file_from_node(node, song.file_name)
        node.file_count = max(0, node.file_count - 1)
        node.used_space_mb = max(0.0, node.used_space_mb - song.file_size_mb)
        node.free_space_mb += song.file_size_mb

    db.delete(song)
    db.commit()
    return {"message": "Song deleted successfully"}


@router.get("/artist/{artist_id}/uploads", response_model=List[SongOut])
def get_artist_uploads(artist_id: int, db: Session = Depends(get_db)):
    return db.query(Song).filter(Song.artist_id == artist_id).order_by(Song.created_at.desc()).all()


@router.get("/my/uploads", response_model=List[SongOut])
def get_my_uploads(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Convenience endpoint: any logged-in user (listener, artist, or admin)
    can see the songs they personally uploaded — Task 3 support."""
    return db.query(Song).filter(Song.artist_id == current_user.id).order_by(Song.created_at.desc()).all()
