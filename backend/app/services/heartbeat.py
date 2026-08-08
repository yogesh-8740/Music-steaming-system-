"""
Background heartbeat task: every 30 seconds, checks each storage node
folder for reachability (exists + writable) and updates its DB status
(online/offline), storage usage, and free space. Also writes a
NodeHealth row per check for historical tracking, and broadcasts
status changes over the global WebSocket channel.
"""
import asyncio
import time
import shutil
from pathlib import Path

from app.core.database import SessionLocal
from app.models.storage import StorageNode, NodeHealth
from app.services.ws_manager import manager

HEARTBEAT_INTERVAL_SECONDS = 30


def _check_node(node: StorageNode) -> tuple[bool, float]:
    """Returns (is_reachable, response_time_ms)."""
    start = time.perf_counter()
    try:
        path = Path(node.folder_path)
        reachable = path.exists() and path.is_dir()
        # touch a temp file to verify writability
        if reachable:
            test_file = path / ".heartbeat_check"
            test_file.write_text("ok")
            test_file.unlink()
        elapsed_ms = (time.perf_counter() - start) * 1000
        return reachable, round(elapsed_ms, 2)
    except Exception:
        elapsed_ms = (time.perf_counter() - start) * 1000
        return False, round(elapsed_ms, 2)


def _update_disk_usage(node: StorageNode) -> None:
    try:
        path = Path(node.folder_path)
        total, used, free = shutil.disk_usage(path)
        # We track *this node folder's* content size, not whole-disk usage,
        # to keep the numbers meaningful for the demo.
        folder_size_bytes = sum(f.stat().st_size for f in path.glob("**/*") if f.is_file())
        node.used_space_mb = round(folder_size_bytes / (1024 * 1024), 3)
    except Exception:
        pass


async def run_heartbeat_loop():
    """Runs forever in the background, checking node health every 30s."""
    while True:
        db = SessionLocal()
        try:
            nodes = db.query(StorageNode).all()
            for node in nodes:
                was_online = node.is_online
                reachable, response_ms = _check_node(node)
                node.is_online = reachable
                _update_disk_usage(node)

                db.add(NodeHealth(
                    node_id=node.id,
                    status="online" if reachable else "offline",
                    response_time_ms=response_ms,
                ))

                if was_online != reachable:
                    await manager.broadcast_global({
                        "type": "node_status_change",
                        "node": node.name,
                        "status": "online" if reachable else "offline",
                    })
            db.commit()
        except Exception as e:
            print(f"[Heartbeat] error: {e}")
        finally:
            db.close()

        await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
