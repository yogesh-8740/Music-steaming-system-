from app.models.user import User


def _register_verified(client, db_session, username):
    client.post("/api/v1/auth/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": "password123",
    })
    user = db_session.query(User).filter(User.username == username).first()
    client.post("/api/v1/auth/verify-email", json={"email": user.email, "code": user.verification_code})
    res = client.post("/api/v1/auth/login", json={"username": username, "password": "password123"})
    return res.json()["access_token"]


def test_network_status_requires_auth(client):
    response = client.get("/api/v1/network/status")
    assert response.status_code == 401


def test_network_status_returns_five_nodes(client, db_session):
    token = _register_verified(client, db_session, "networkuser")
    response = client.get("/api/v1/network/status", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["nodes"]) == 5
    assert "algorithm" in data
    assert "live_listeners" in data
    assert "cache" in data
