from app.models.user import User


def _verify_user(db_session, username):
    """Test helper: reads the verification code straight from the DB
    (standing in for 'checking your email') and completes verification."""
    user = db_session.query(User).filter(User.username == username).first()
    return user.verification_code, user.email


def test_register_new_user(client):
    response = client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "password123",
        "role": "user",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["role"] == "user"
    assert data["is_verified"] is False


def test_register_duplicate_username_fails(client):
    payload = {
        "username": "dupeuser",
        "email": "dupe1@example.com",
        "password": "password123",
    }
    client.post("/api/v1/auth/register", json=payload)
    payload["email"] = "dupe2@example.com"
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400


def test_login_before_verification_fails(client):
    client.post("/api/v1/auth/register", json={
        "username": "unverifieduser",
        "email": "unverified@example.com",
        "password": "password123",
    })
    response = client.post("/api/v1/auth/login", json={
        "username": "unverifieduser",
        "password": "password123",
    })
    assert response.status_code == 403
    assert "verify" in response.json()["detail"].lower()


def test_verify_email_with_correct_code_then_login_succeeds(client, db_session):
    client.post("/api/v1/auth/register", json={
        "username": "verifyuser",
        "email": "verify@example.com",
        "password": "password123",
    })
    code, email = _verify_user(db_session, "verifyuser")
    assert code is not None

    verify_res = client.post("/api/v1/auth/verify-email", json={"email": email, "code": code})
    assert verify_res.status_code == 200
    assert "access_token" in verify_res.json()

    login_res = client.post("/api/v1/auth/login", json={
        "username": "verifyuser",
        "password": "password123",
    })
    assert login_res.status_code == 200


def test_verify_email_with_wrong_code_fails(client, db_session):
    client.post("/api/v1/auth/register", json={
        "username": "wrongcodeuser",
        "email": "wrongcode@example.com",
        "password": "password123",
    })
    response = client.post("/api/v1/auth/verify-email", json={
        "email": "wrongcode@example.com", "code": "000000",
    })
    assert response.status_code == 400


def test_resend_verification_issues_new_code(client, db_session):
    client.post("/api/v1/auth/register", json={
        "username": "resenduser",
        "email": "resend@example.com",
        "password": "password123",
    })
    old_code, email = _verify_user(db_session, "resenduser")

    resend_res = client.post("/api/v1/auth/resend-verification", json={"email": email})
    assert resend_res.status_code == 200

    db_session.expire_all()
    new_code, _ = _verify_user(db_session, "resenduser")
    assert new_code is not None
    verify_res = client.post("/api/v1/auth/verify-email", json={"email": email, "code": new_code})
    assert verify_res.status_code == 200


def test_login_wrong_password_fails(client, db_session):
    client.post("/api/v1/auth/register", json={
        "username": "wrongpassuser",
        "email": "wrongpass@example.com",
        "password": "password123",
    })
    code, email = _verify_user(db_session, "wrongpassuser")
    client.post("/api/v1/auth/verify-email", json={"email": email, "code": code})

    response = client.post("/api/v1/auth/login", json={
        "username": "wrongpassuser",
        "password": "incorrect",
    })
    assert response.status_code == 401


def test_get_me_requires_auth(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_get_me_with_valid_token(client, db_session):
    client.post("/api/v1/auth/register", json={
        "username": "meuser",
        "email": "meuser@example.com",
        "password": "password123",
    })
    code, email = _verify_user(db_session, "meuser")
    client.post("/api/v1/auth/verify-email", json={"email": email, "code": code})

    login_res = client.post("/api/v1/auth/login", json={
        "username": "meuser",
        "password": "password123",
    })
    token = login_res.json()["access_token"]
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "meuser"
