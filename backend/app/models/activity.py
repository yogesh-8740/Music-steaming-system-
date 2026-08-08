from datetime import datetime, timezone
from sqlalchemy import Integer, DateTime, ForeignKey, String, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Favorite(Base):
    __tablename__ = "favorites"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="favorites")
    song = relationship("Song", back_populates="favorites")


class ListeningHistory(Base):
    __tablename__ = "listening_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id"), nullable=False)
    played_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    progress_seconds: Mapped[float] = mapped_column(Float, default=0.0)

    user = relationship("User", back_populates="history")
    song = relationship("Song", back_populates="history_entries")


class StreamingLog(Base):
    __tablename__ = "streaming_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    storage_node_id: Mapped[int] = mapped_column(ForeignKey("storage_nodes.id"), nullable=True)
    served_from_cache: Mapped[bool] = mapped_column(Boolean, default=False)
    bytes_streamed: Mapped[float] = mapped_column(Float, default=0.0)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    song = relationship("Song", back_populates="streaming_logs")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    notif_type: Mapped[str] = mapped_column(String(50), default="info")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")
