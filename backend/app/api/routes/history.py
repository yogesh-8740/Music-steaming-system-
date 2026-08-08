from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.activity import ListeningHistory
from app.schemas.song import SongOut

router = APIRouter(prefix="/history", tags=["Listening History"])


@router.get("/recent", response_model=List[SongOut])
def get_recently_played(limit: int = Query(20, le=100), db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    entries = (
        db.query(ListeningHistory)
        .filter(ListeningHistory.user_id == current_user.id)
        .order_by(ListeningHistory.played_at.desc())
        .limit(limit)
        .all()
    )
    seen = set()
    songs = []
    for e in entries:
        if e.song_id not in seen:
            seen.add(e.song_id)
            songs.append(e.song)
    return songs


@router.delete("/clear")
def clear_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(ListeningHistory).filter(ListeningHistory.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Listening history cleared"}
