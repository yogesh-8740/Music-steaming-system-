from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    user = "user"
    artist = "artist"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=True)
    bio: Mapped[str] = mapped_column(String(500), nullable=True)
    avatar_path: Mapped[str] = mapped_column(String(500), nullable=True)

    role: Mapped[str] = mapped_column(Enum(UserRole), default=UserRole.user, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Email verification (confirmation code sent on signup)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_code: Mapped[str] = mapped_column(String(10), nullable=True)
    verification_code_expires: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Lets an admin disable a specific account's upload privilege while
    # keeping uploads open to every role (listener/artist/admin) by default.
    can_upload: Mapped[bool] = mapped_column(Boolean, default=True)

    reset_token: Mapped[str] = mapped_column(String(255), nullable=True)
    reset_token_expires: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_code: Mapped[str] = mapped_column(String(10), nullable=True)
    verification_code_expires: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # relationships
    songs = relationship("Song", back_populates="artist", cascade="all, delete-orphan")
    playlists = relationship("Playlist", back_populates="owner", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    history = relationship("ListeningHistory", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
