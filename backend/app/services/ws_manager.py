"""
Simple WebSocket connection manager supporting:
- per-user notification channels
- a global "listener count" / admin alerts broadcast channel
"""
import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # user_id -> list of active websocket connections (multi-tab support)
        self.user_connections: Dict[int, List[WebSocket]] = {}
        # global connections (e.g. admin dashboard, live listener count)
        self.global_connections: List[WebSocket] = []
        self.live_listeners = 0

    async def connect_user(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.user_connections.setdefault(user_id, []).append(websocket)

    def disconnect_user(self, user_id: int, websocket: WebSocket):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def send_to_user(self, user_id: int, message: dict):
        for ws in self.user_connections.get(user_id, []):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                pass

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.append(websocket)
        self.live_listeners += 1
        await self.broadcast_global({"type": "listener_count", "count": self.live_listeners})

    async def disconnect_global(self, websocket: WebSocket):
        if websocket in self.global_connections:
            self.global_connections.remove(websocket)
        self.live_listeners = max(0, self.live_listeners - 1)
        await self.broadcast_global({"type": "listener_count", "count": self.live_listeners})

    async def broadcast_global(self, message: dict):
        dead = []
        for ws in self.global_connections:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self.global_connections:
                self.global_connections.remove(ws)


manager = ConnectionManager()
