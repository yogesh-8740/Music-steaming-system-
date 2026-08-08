"""
Import every model here so that Base.metadata is fully populated
for Alembic autogenerate and for create_all() during dev bootstrapping.
"""
from app.models.user import User, UserRole
from app.models.music_meta import Genre, Album
from app.models.storage import StorageNode, NodeHealth
from app.models.song import Song
from app.models.playlist import Playlist, PlaylistSong
from app.models.activity import Favorite, ListeningHistory, StreamingLog, Notification

__all__ = [
    "User", "UserRole",
    "Genre", "Album",
    "StorageNode", "NodeHealth",
    "Song",
    "Playlist", "PlaylistSong",
    "Favorite", "ListeningHistory", "StreamingLog", "Notification",
]
