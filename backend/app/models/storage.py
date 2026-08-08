from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class StorageNode(Base):
    __tablename__ = "storage_nodes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)  # e.g. storage_node1
    folder_path: Mapped[str] = mapped_column(String(500), nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=1)  # higher = preferred
    file_count: Mapped[int] = mapped_column(Integer, default=0)
    used_space_mb: Mapped[float] = mapped_column(Float, default=0.0)
    free_space_mb: Mapped[float] = mapped_column(Float, default=10000.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    health_logs = relationship("NodeHealth", back_populates="node", cascade="all, delete-orphan")


class NodeHealth(Base):
    __tablename__ = "node_health"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("storage_nodes.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="online")  # online / offline
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    response_time_ms: Mapped[float] = mapped_column(Float, nullable=True)

    node = relationship("StorageNode", back_populates="health_logs")
