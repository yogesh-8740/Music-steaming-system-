"""
StorageManager simulates a decentralized storage layer using plain local
folders (storage_node1 .. storage_node5) instead of blockchain/IPFS.

Responsibilities:
- Ensure each node folder exists on disk.
- Keep a StorageNode row in Postgres per folder (metadata + stats).
- Select a node to store a new file into, based on the configured
  load-balancing algorithm (round robin / least used / random).
- Read a file back given its DB record (song.storage_node_id + file_name),
  with automatic failover to another node if the primary is offline
  (in a real distributed system files would be replicated; here we
  simulate the "try next available node" behavior for resilience demo).
"""
import random
import shutil
from pathlib import Path
from typing import Optional, BinaryIO

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.storage import StorageNode

# module-level round robin cursor (simple in-memory pointer, resets on restart)
_round_robin_index = 0


def bootstrap_storage_nodes(db: Session) -> None:
    """Create storage_node folders on disk and matching DB rows if missing."""
    base_path = settings.storage_nodes_abs_path
    base_path.mkdir(parents=True, exist_ok=True)

    for i in range(1, settings.STORAGE_NODE_COUNT + 1):
        node_name = f"storage_node{i}"
        node_folder = base_path / node_name
        node_folder.mkdir(parents=True, exist_ok=True)

        existing = db.query(StorageNode).filter(StorageNode.name == node_name).first()
        if not existing:
            node = StorageNode(
                name=node_name,
                folder_path=str(node_folder),
                is_online=True,
                priority=1,
                file_count=0,
                used_space_mb=0.0,
                free_space_mb=10000.0,
            )
            db.add(node)
    db.commit()


def _get_online_nodes(db: Session) -> list[StorageNode]:
    return db.query(StorageNode).filter(StorageNode.is_online == True).order_by(StorageNode.id).all()  # noqa: E712


def select_node_round_robin(db: Session) -> Optional[StorageNode]:
    global _round_robin_index
    nodes = _get_online_nodes(db)
    if not nodes:
        return None
    node = nodes[_round_robin_index % len(nodes)]
    _round_robin_index += 1
    return node


def select_node_least_used(db: Session) -> Optional[StorageNode]:
    nodes = _get_online_nodes(db)
    if not nodes:
        return None
    return min(nodes, key=lambda n: n.used_space_mb)


def select_node_random(db: Session) -> Optional[StorageNode]:
    nodes = _get_online_nodes(db)
    if not nodes:
        return None
    return random.choice(nodes)


def select_node(db: Session, algorithm: Optional[str] = None) -> Optional[StorageNode]:
    algo = algorithm or settings.LOAD_BALANCING_ALGORITHM
    if algo == "least_used":
        return select_node_least_used(db)
    if algo == "random":
        return select_node_random(db)
    return select_node_round_robin(db)  # default


def save_file_to_node(node: StorageNode, filename: str, file_obj: BinaryIO) -> str:
    """Streams an uploaded file into the given node's folder. Returns full path."""
    dest_path = Path(node.folder_path) / filename
    with open(dest_path, "wb") as out_file:
        shutil.copyfileobj(file_obj, out_file)
    return str(dest_path)


def update_node_stats_after_upload(db: Session, node: StorageNode, file_size_mb: float) -> None:
    node.file_count += 1
    node.used_space_mb += file_size_mb
    node.free_space_mb = max(0.0, node.free_space_mb - file_size_mb)
    db.commit()


def get_file_path(node: StorageNode, filename: str) -> Path:
    return Path(node.folder_path) / filename


def find_failover_node(db: Session, exclude_node_id: int) -> Optional[StorageNode]:
    """Used when the primary node holding a song is offline - simulated failover."""
    nodes = db.query(StorageNode).filter(
        StorageNode.is_online == True,  # noqa: E712
        StorageNode.id != exclude_node_id,
    ).all()
    return nodes[0] if nodes else None


def delete_file_from_node(node: StorageNode, filename: str) -> None:
    path = get_file_path(node, filename)
    if path.exists():
        path.unlink()
