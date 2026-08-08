from app.models.user import User


def _register_and_login(client, db_session, username, role="user"):
    client.post("/api/v1/auth/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": "password123",
        "role": role,
    })
    user = db_session.query(User).filter(User.username == username).first()
    client.post("/api/v1/auth/verify-email", json={"email": user.email, "code": user.verification_code})

    res = client.post("/api/v1/auth/login", json={"username": username, "password": "password123"})
    return res.json()["access_token"]


def test_list_songs_empty(client):
    response = client.get("/api/v1/songs")
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_list_playlist(client, db_session):
    token = _register_and_login(client, db_session, "playlistuser")
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post("/api/v1/playlists", json={"name": "My Chill Mix", "is_public": False}, headers=headers)
    assert create_res.status_code == 201

    list_res = client.get("/api/v1/playlists/mine", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["name"] == "My Chill Mix"


def test_regular_listener_can_upload_songs(client, db_session):
    """Task 3: uploading is open to every role, not just 'artist' accounts."""
    token = _register_and_login(client, db_session, "regularuploader", role="user")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/songs/upload",
        data={"title": "My First Upload"},
        files={"audio_file": ("test.mp3", b"fake-audio-bytes", "audio/mpeg")},
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["title"] == "My First Upload"


def test_admin_can_disable_a_users_upload_privilege(client, db_session):
    token = _register_and_login(client, db_session, "revokeduser", role="user")
    headers = {"Authorization": f"Bearer {token}"}

    user = db_session.query(User).filter(User.username == "revokeduser").first()
    user.can_upload = False
    db_session.commit()

    response = client.post(
        "/api/v1/songs/upload",
        data={"title": "Should Fail"},
        files={"audio_file": ("test.mp3", b"fake-audio-bytes", "audio/mpeg")},
        headers=headers,
    )
    assert response.status_code == 403


def test_upload_without_auth_rejected(client):
    response = client.post(
        "/api/v1/songs/upload",
        data={"title": "No Auth"},
        files={"audio_file": ("test.mp3", b"fake-audio-bytes", "audio/mpeg")},
    )
    assert response.status_code == 401


def test_genres_endpoint_accessible_without_auth(client):
    response = client.get("/api/v1/genres")
    assert response.status_code == 200
