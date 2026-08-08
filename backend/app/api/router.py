from fastapi import APIRouter

from app.api.routes import (
    auth, users, songs, streaming, favorites, playlists,
    history, catalog, artist, admin, analytics, recommendations,
    notifications, websocket, network,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(songs.router)
api_router.include_router(streaming.router)
api_router.include_router(favorites.router)
api_router.include_router(playlists.router)
api_router.include_router(history.router)
api_router.include_router(catalog.router)
api_router.include_router(artist.router)
api_router.include_router(admin.router)
api_router.include_router(analytics.router)
api_router.include_router(recommendations.router)
api_router.include_router(notifications.router)
api_router.include_router(websocket.router)
api_router.include_router(network.router)
