"""
Reusable FastAPI dependencies: get_current_user, role guards.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return user


def require_role(*allowed_roles: str):
    """Dependency factory: restricts an endpoint to one or more roles."""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


require_admin = require_role("admin")
require_artist = require_role("artist", "admin")
require_user = require_role("user", "artist", "admin")


def require_uploader(current_user: User = Depends(get_current_user)) -> User:
    """
    Any authenticated user (listener, artist, or admin) can upload their own
    songs to the platform - not just "artist"-role accounts. This powers
    Task 3: listener-uploaded music. Admins can still individually revoke
    a specific account's upload privilege via the `can_upload` flag.
    """
    if not current_user.can_upload:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Uploading has been disabled for this account by an administrator.",
        )
    return current_user

