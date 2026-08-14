import sys
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.api.router import api_router
from app.services.storage_manager import bootstrap_storage_nodes
from app.services.heartbeat import run_heartbeat_loop

# import models so metadata is populated before create_all()
import app.models  # noqa: F401

# Ensure upload directories exist BEFORE StaticFiles mount (which happens at import time)
settings.uploads_abs_path.mkdir(parents=True, exist_ok=True)
(settings.uploads_abs_path / "songs").mkdir(parents=True, exist_ok=True)
(settings.uploads_abs_path / "covers").mkdir(parents=True, exist_ok=True)
(settings.uploads_abs_path / "avatars").mkdir(parents=True, exist_ok=True)

_heartbeat_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    Base.metadata.create_all(bind=engine)

    settings.uploads_abs_path.mkdir(parents=True, exist_ok=True)
    (settings.uploads_abs_path / "songs").mkdir(parents=True, exist_ok=True)
    (settings.uploads_abs_path / "covers").mkdir(parents=True, exist_ok=True)
    (settings.uploads_abs_path / "avatars").mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        bootstrap_storage_nodes(db)
    finally:
        db.close()

    global _heartbeat_task
    _heartbeat_task = asyncio.create_task(run_heartbeat_loop())

    print(f"🎵 {settings.APP_NAME} started")
    print(f"📡 API docs available at http://localhost:8000/docs")
    print(f"💾 Storage nodes root: {settings.storage_nodes_abs_path}")

    yield

    # ---- Shutdown ----
    if _heartbeat_task:
        _heartbeat_task.cancel()
        try:
            await _heartbeat_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title=settings.APP_NAME,
    description="A decentralized (blockchain-free) music streaming platform built with FastAPI + React.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded cover art / avatars directly as static files
app.mount("/uploads", StaticFiles(directory=str(settings.uploads_abs_path)), name="uploads")

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "api_prefix": settings.API_V1_PREFIX,
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
