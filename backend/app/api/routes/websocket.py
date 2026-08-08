from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.ws_manager import manager
from app.core.security import decode_token

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket, token: str = Query(...)):
    """Per-user real-time notifications (song upload complete, alerts, etc.)"""
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4401)
        return

    user_id = int(payload["sub"])
    await manager.connect_user(user_id, websocket)
    try:
        while True:
            # Keep connection alive; client may send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_user(user_id, websocket)


@router.websocket("/ws/live")
async def live_channel_ws(websocket: WebSocket):
    """Global channel: live listener count + admin alerts + streaming status."""
    await manager.connect_global(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect_global(websocket)
