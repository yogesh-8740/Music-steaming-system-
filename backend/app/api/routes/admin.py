from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.config import settings
from app.models.user import User
from app.models.song import Song
from app.models.storage import StorageNode, NodeHealth
from app.schemas.user import UserOut
from app.schemas.song import SongOut
from app.schemas.storage import StorageNodeOut, LoadBalancingUpdate
from app.services.cache_manager import song_cache

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard")
def admin_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    total_users = db.query(User).filter(User.role == "user").count()
    total_artists = db.query(User).filter(User.role == "artist").count()
    total_songs = db.query(Song).count()
    total_plays = db.query(Song).with_entities(Song.play_count).all()
    total_play_count = sum(p[0] for p in total_plays)
    online_nodes = db.query(StorageNode).filter(StorageNode.is_online == True).count()  # noqa: E712
    total_nodes = db.query(StorageNode).count()

    return {
        "total_users": total_users,
        "total_artists": total_artists,
        "total_songs": total_songs,
        "total_plays": total_play_count,
        "online_nodes": online_nodes,
        "total_nodes": total_nodes,
        "current_load_balancing_algorithm": settings.LOAD_BALANCING_ALGORITHM,
        "cache_stats": song_cache.stats(),
    }


# ---------------- User / Artist management ----------------

@router.get("/users", response_model=List[UserOut])
def list_all_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User is now {'active' if user.is_active else 'disabled'}"}


@router.put("/users/{user_id}/toggle-upload")
def toggle_user_upload(user_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(require_admin)):
    """Task 3 support: admins can individually revoke or restore a
    specific account's ability to upload songs, without affecting
    their listening/streaming access."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.can_upload = not user.can_upload
    db.commit()
    return {"message": f"Uploading is now {'enabled' if user.can_upload else 'disabled'} for this user"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


# ---------------- Song management ----------------

@router.get("/songs", response_model=List[SongOut])
def list_all_songs(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(Song).order_by(Song.created_at.desc()).all()


@router.delete("/songs/{song_id}")
def admin_delete_song(song_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(require_admin)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    db.delete(song)
    db.commit()
    return {"message": "Song deleted by admin"}


# ---------------- Storage node management ----------------

@router.get("/storage-nodes", response_model=List[StorageNodeOut])
def list_storage_nodes(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(StorageNode).order_by(StorageNode.name).all()


@router.put("/storage-nodes/{node_id}/toggle-online")
def toggle_node_online(node_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(require_admin)):
    node = db.query(StorageNode).filter(StorageNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    node.is_online = not node.is_online
    db.commit()
    db.add(NodeHealth(node_id=node.id, status="online" if node.is_online else "offline"))
    db.commit()
    return {"message": f"Node '{node.name}' is now {'online' if node.is_online else 'offline'}"}


@router.put("/load-balancing")
def update_load_balancing(payload: LoadBalancingUpdate, current_user: User = Depends(require_admin)):
    valid_algos = {"round_robin", "least_used", "random"}
    if payload.algorithm not in valid_algos:
        raise HTTPException(status_code=400, detail=f"Algorithm must be one of {valid_algos}")
    settings.LOAD_BALANCING_ALGORITHM = payload.algorithm
    return {"message": f"Load balancing algorithm set to '{payload.algorithm}'"}


@router.get("/cache-stats")
def get_cache_stats(current_user: User = Depends(require_admin)):
    return song_cache.stats()


@router.get("/node-health/{node_id}")
def get_node_health_history(node_id: int, limit: int = 20, db: Session = Depends(get_db),
                             current_user: User = Depends(require_admin)):
    logs = (
        db.query(NodeHealth)
        .filter(NodeHealth.node_id == node_id)
        .order_by(NodeHealth.checked_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {"status": log.status, "checked_at": log.checked_at, "response_time_ms": log.response_time_ms}
        for log in logs
    ]
