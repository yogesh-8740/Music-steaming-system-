from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.song import Song
from app.models.playlist import Playlist, PlaylistSong
from app.schemas.playlist import PlaylistCreate, PlaylistUpdate, PlaylistOut, PlaylistDetailOut, AddSongToPlaylist

router = APIRouter(prefix="/playlists", tags=["Playlists"])


def _check_owner(playlist: Playlist, user: User):
    if playlist.owner_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized for this playlist")


@router.post("", response_model=PlaylistOut, status_code=201)
def create_playlist(payload: PlaylistCreate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    playlist = Playlist(name=payload.name, is_public=payload.is_public, owner_id=current_user.id)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist


@router.get("/mine", response_model=List[PlaylistOut])
def get_my_playlists(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Playlist).filter(Playlist.owner_id == current_user.id).order_by(Playlist.created_at.desc()).all()


@router.get("/public", response_model=List[PlaylistOut])
def get_public_playlists(db: Session = Depends(get_db)):
    return db.query(Playlist).filter(Playlist.is_public == True).order_by(Playlist.created_at.desc()).all()  # noqa: E712


@router.get("/{playlist_id}", response_model=PlaylistDetailOut)
def get_playlist(playlist_id: int, db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    result = PlaylistDetailOut.model_validate(playlist)
    result.songs = [ps.song for ps in playlist.songs]
    return result


@router.put("/{playlist_id}", response_model=PlaylistOut)
def rename_playlist(playlist_id: int, payload: PlaylistUpdate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    _check_owner(playlist, current_user)

    if payload.name is not None:
        playlist.name = payload.name
    if payload.is_public is not None:
        playlist.is_public = payload.is_public
    db.commit()
    db.refresh(playlist)
    return playlist


@router.delete("/{playlist_id}")
def delete_playlist(playlist_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    _check_owner(playlist, current_user)
    db.delete(playlist)
    db.commit()
    return {"message": "Playlist deleted"}


@router.post("/{playlist_id}/songs")
def add_song_to_playlist(playlist_id: int, payload: AddSongToPlaylist, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    _check_owner(playlist, current_user)

    song = db.query(Song).filter(Song.id == payload.song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    existing = db.query(PlaylistSong).filter(
        PlaylistSong.playlist_id == playlist_id, PlaylistSong.song_id == payload.song_id
    ).first()
    if existing:
        return {"message": "Song already in playlist"}

    max_position = db.query(PlaylistSong).filter(PlaylistSong.playlist_id == playlist_id).count()
    db.add(PlaylistSong(playlist_id=playlist_id, song_id=payload.song_id, position=max_position))
    db.commit()
    return {"message": "Song added to playlist"}


@router.delete("/{playlist_id}/songs/{song_id}")
def remove_song_from_playlist(playlist_id: int, song_id: int, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    _check_owner(playlist, current_user)

    entry = db.query(PlaylistSong).filter(
        PlaylistSong.playlist_id == playlist_id, PlaylistSong.song_id == song_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Song not in playlist")
    db.delete(entry)
    db.commit()
    return {"message": "Song removed from playlist"}
