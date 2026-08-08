"""
Powers the "Network Map" — a live, visual view of the decentralized
storage layer. Any logged-in user can open it to *watch* the system's
core mechanic in action: which node an upload/stream is routed to,
node health flipping on/off, and the live listener count — all updating
in real time over the /ws/live WebSocket channel.

This is intentionally exposed as an opt-in "engineering view" (its own
page, not baked into normal playback) rather than shown during regular
listening, so it doesn't contradict the platform's usual promise that
listeners don't need to think about where a file physically lives.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.storage import StorageNode
from app.services.cache_manager import song_cache
from app.services.ws_manager import manager

router = APIRouter(prefix="/network", tags=["Network Map"])


@router.get("/status")
def network_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    nodes = db.query(StorageNode).order_by(StorageNode.name).all()

    total_capacity = sum((n.used_space_mb + n.free_space_mb) for n in nodes) or 1
    node_data = [
        {
            "id": n.id,
            "name": n.name,
            "is_online": n.is_online,
            "file_count": n.file_count,
            "used_space_mb": round(n.used_space_mb, 2),
            "free_space_mb": round(n.free_space_mb, 2),
            "load_percent": round((n.used_space_mb / total_capacity) * 100, 1),
        }
        for n in nodes
    ]

    return {
        "nodes": node_data,
        "algorithm": settings.LOAD_BALANCING_ALGORITHM,
        "live_listeners": manager.live_listeners,
        "cache": song_cache.stats(),
    }
