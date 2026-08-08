from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.song import Song
from app.models.activity import StreamingLog
from app.models.storage import StorageNode

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/streams-daily")
def streams_daily(days: int = 7, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(func.date(StreamingLog.timestamp).label("day"), func.count(StreamingLog.id))
        .filter(StreamingLog.timestamp >= since)
        .group_by("day")
        .order_by("day")
        .all()
    )
    return [{"date": str(r[0]), "streams": r[1]} for r in rows]


@router.get("/top-songs")
def top_songs(limit: int = 10, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    songs = db.query(Song).order_by(Song.play_count.desc()).limit(limit).all()
    return [{"id": s.id, "title": s.title, "play_count": s.play_count} for s in songs]


@router.get("/top-artists")
def top_artists(limit: int = 10, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    rows = (
        db.query(User.username, func.sum(Song.play_count).label("total_plays"))
        .join(Song, Song.artist_id == User.id)
        .group_by(User.id)
        .order_by(func.sum(Song.play_count).desc())
        .limit(limit)
        .all()
    )
    return [{"artist": r[0], "total_plays": int(r[1] or 0)} for r in rows]


@router.get("/storage-usage")
def storage_usage(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    nodes = db.query(StorageNode).all()
    return [
        {
            "node": n.name,
            "used_space_mb": n.used_space_mb,
            "free_space_mb": n.free_space_mb,
            "file_count": n.file_count,
            "is_online": n.is_online,
        }
        for n in nodes
    ]


@router.get("/active-users")
def active_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    total = db.query(User).filter(User.is_active == True).count()  # noqa: E712
    return {"active_users": total}
