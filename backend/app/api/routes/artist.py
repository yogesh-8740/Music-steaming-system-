from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import require_artist
from app.models.user import User
from app.models.song import Song

router = APIRouter(prefix="/artist", tags=["Artist Dashboard"])


@router.get("/stats/overview")
def artist_overview(db: Session = Depends(get_db), current_user: User = Depends(require_artist)):
    songs = db.query(Song).filter(Song.artist_id == current_user.id).all()

    total_plays = sum(s.play_count for s in songs)
    total_likes = sum(s.like_count for s in songs)
    total_downloads = sum(s.download_count for s in songs)

    return {
        "total_songs": len(songs),
        "total_plays": total_plays,
        "total_likes": total_likes,
        "total_downloads": total_downloads,
    }


@router.get("/stats/top-songs")
def artist_top_songs(db: Session = Depends(get_db), current_user: User = Depends(require_artist)):
    songs = (
        db.query(Song)
        .filter(Song.artist_id == current_user.id)
        .order_by(Song.play_count.desc())
        .limit(10)
        .all()
    )
    return [
        {"id": s.id, "title": s.title, "play_count": s.play_count, "like_count": s.like_count}
        for s in songs
    ]
