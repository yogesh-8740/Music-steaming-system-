from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Song(Base):
    __tablename__ = "songs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    artist_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    album_id: Mapped[int] = mapped_column(ForeignKey("albums.id"), nullable=True)
    genre_id: Mapped[int] = mapped_column(ForeignKey("genres.id"), nullable=True)

    # file storage info
    file_name: Mapped[str] = mapped_column(String(300), nullable=False)
    file_format: Mapped[str] = mapped_column(String(10), nullable=False)  # mp3 / wav
    file_size_mb: Mapped[float] = mapped_column(Float, default=0.0)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    storage_node_id: Mapped[int] = mapped_column(ForeignKey("storage_nodes.id"), nullable=False)

    cover_art_path: Mapped[str] = mapped_column(String(500), nullable=True)

    # stats
    play_count: Mapped[int] = mapped_column(Integer, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    download_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    artist = relationship("User", back_populates="songs", foreign_keys=[artist_id])
    album = relationship("Album", back_populates="songs")
    genre = relationship("Genre", back_populates="songs")
    storage_node = relationship("StorageNode")

    favorites = relationship("Favorite", back_populates="song", cascade="all, delete-orphan")
    history_entries = relationship("ListeningHistory", back_populates="song", cascade="all, delete-orphan")
    streaming_logs = relationship("StreamingLog", back_populates="song", cascade="all, delete-orphan")
    playlist_entries = relationship("PlaylistSong", back_populates="song", cascade="all, delete-orphan")
