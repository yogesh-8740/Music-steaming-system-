"""
Central application configuration.
Reads values from environment variables / .env file using pydantic-settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    # ---- Database ----
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/music_streaming_db"

    # ---- JWT ----
    SECRET_KEY: str = "dev-secret-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ---- App ----
    APP_NAME: str = "Decentralized Music Streaming System"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ---- CORS ----
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # ---- Storage ----
    STORAGE_NODES_PATH: str = "../storage_nodes"
    STORAGE_NODE_COUNT: int = 5
    LOAD_BALANCING_ALGORITHM: str = "round_robin"

    # ---- Uploads ----
    UPLOADS_PATH: str = "../uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ---- Cache ----
    LRU_CACHE_SIZE: int = 50

    # ---- Email (optional real SMTP; falls back to console simulation if unset) ----
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 15

    model_config = SettingsConfigDict(
    env_file=Path(__file__).resolve().parent.parent.parent.parent / ".env",
    extra="ignore"
)

    @property
    def storage_nodes_abs_path(self) -> Path:
        base = Path(__file__).resolve().parent.parent.parent  # backend/
        return (base / self.STORAGE_NODES_PATH).resolve()

    @property
    def uploads_abs_path(self) -> Path:
        base = Path(__file__).resolve().parent.parent.parent  # backend/
        return (base / self.UPLOADS_PATH).resolve()


settings = Settings()
