from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class GenreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None


class GenreCreate(BaseModel):
    name: str = Field(..., max_length=80)
    description: Optional[str] = None


class AlbumOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    artist_id: int
    cover_art_path: Optional[str] = None
    release_year: Optional[int] = None


class AlbumCreate(BaseModel):
    title: str
    release_year: Optional[int] = None


class SongUpdate(BaseModel):
    title: Optional[str] = None
    genre_id: Optional[int] = None
    album_id: Optional[int] = None


class SongOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    artist_id: int
    album_id: Optional[int] = None
    genre_id: Optional[int] = None
    file_format: str
    file_size_mb: float
    duration_seconds: float
    cover_art_path: Optional[str] = None
    play_count: int
    like_count: int
    download_count: int
    created_at: datetime


class SongDetailOut(SongOut):
    artist_username: Optional[str] = None
    genre_name: Optional[str] = None
    album_title: Optional[str] = None
    storage_node_name: Optional[str] = None
