from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class StorageNodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_online: bool
    priority: int
    file_count: int
    used_space_mb: float
    free_space_mb: float


class LoadBalancingUpdate(BaseModel):
    algorithm: str  # round_robin | least_used | random


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    message: str
    is_read: bool
    notif_type: str
    created_at: datetime


class CacheStatsOut(BaseModel):
    cache_size: int
    max_size: int
    hits: int
    misses: int
    hit_ratio: float
    cached_song_ids: List[int]
