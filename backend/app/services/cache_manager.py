"""
Simple in-memory LRU cache for song audio bytes, used to simulate
caching of "popular" songs so repeated streams don't always hit disk.

Implemented with collections.OrderedDict for true O(1) LRU behavior.
This is process-local (resets on server restart) which is fine for a
local/dev-scale demo system.
"""
from collections import OrderedDict
from threading import Lock
from app.core.config import settings


class LRUCache:
    def __init__(self, max_size: int = None):
        self.max_size = max_size or settings.LRU_CACHE_SIZE
        self._store: "OrderedDict[int, bytes]" = OrderedDict()
        self._lock = Lock()
        self.hits = 0
        self.misses = 0

    def get(self, song_id: int) -> bytes | None:
        with self._lock:
            if song_id in self._store:
                self._store.move_to_end(song_id)
                self.hits += 1
                return self._store[song_id]
            self.misses += 1
            return None

    def put(self, song_id: int, data: bytes) -> None:
        with self._lock:
            if song_id in self._store:
                self._store.move_to_end(song_id)
            self._store[song_id] = data
            if len(self._store) > self.max_size:
                self._store.popitem(last=False)  # evict least recently used

    @property
    def hit_ratio(self) -> float:
        total = self.hits + self.misses
        return round((self.hits / total) * 100, 2) if total else 0.0

    def stats(self) -> dict:
        return {
            "cache_size": len(self._store),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio": self.hit_ratio,
            "cached_song_ids": list(self._store.keys()),
        }


# single shared instance used across the app
song_cache = LRUCache()
