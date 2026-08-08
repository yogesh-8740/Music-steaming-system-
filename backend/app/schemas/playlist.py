from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.song import SongOut


class PlaylistCreate(BaseModel):
    name: str = Field(..., max_length=150)
    is_public: bool = False


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    is_public: Optional[bool] = None


class PlaylistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    owner_id: int
    is_public: bool
    cover_art_path: Optional[str] = None
    created_at: datetime


class PlaylistDetailOut(PlaylistOut):
    songs: List[SongOut] = []


class AddSongToPlaylist(BaseModel):
    song_id: int
