from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.song import Song
from app.models.activity import Favorite
from app.schemas.song import SongOut

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.post("/{song_id}")
def add_favorite(song_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id, Favorite.song_id == song_id
    ).first()
    if existing:
        return {"message": "Already in favorites"}

    db.add(Favorite(user_id=current_user.id, song_id=song_id))
    song.like_count += 1
    db.commit()
    return {"message": "Added to favorites"}


@router.delete("/{song_id}")
def remove_favorite(song_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    fav = db.query(Favorite).filter(
        Favorite.user_id == current_user.id, Favorite.song_id == song_id
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")

    song = db.query(Song).filter(Song.id == song_id).first()
    if song and song.like_count > 0:
        song.like_count -= 1

    db.delete(fav)
    db.commit()
    return {"message": "Removed from favorites"}


@router.get("", response_model=List[SongOut])
def list_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    favs = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
    return [f.song for f in favs]
