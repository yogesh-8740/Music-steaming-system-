"""
Shared pytest fixtures. Tests run against an isolated SQLite file
database (not Postgres) so they're fast and don't require a running
database server — ideal for CI and quick local test runs.

IMPORTANT: DATABASE_URL and STORAGE_NODES_PATH env vars are overridden
BEFORE importing app.main, because app.core.database builds its engine
at import time and app.main's lifespan calls Base.metadata.create_all()
against that same engine on TestClient startup. Setting the env vars
first means the whole app - not just the get_db dependency - runs
against the disposable test database and a temp storage folder.
"""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

_TMP_DIR = tempfile.mkdtemp(prefix="wavenet_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DIR}/test.db"
os.environ["STORAGE_NODES_PATH"] = f"{_TMP_DIR}/storage_nodes"
os.environ["UPLOADS_PATH"] = f"{_TMP_DIR}/uploads"

import pytest
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.database import Base, get_db, engine
import app.models  # noqa: F401
from app.main import app

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
