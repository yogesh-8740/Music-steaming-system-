"""
Authentication endpoints: register, login, refresh token, logout,
forgot password, reset password.

Note on "logout": since JWT access tokens are stateless, logout is
handled client-side by discarding the tokens. This endpoint exists
for API completeness / audit logging and returns a confirmation.
"""
import secrets
import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token,
)
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import (
    UserRegister, UserLogin, UserOut, Token, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    VerifyEmailRequest, ResendVerificationRequest,
)
from app.services.email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _generate_verification_code() -> str:
    return f"{random.randint(0, 999999):06d}"


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    role = payload.role if payload.role in ("user", "artist") else "user"
    code = _generate_verification_code()

    user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=role,
        is_verified=False,
        verification_code=code,
        verification_code_expires=datetime.now(timezone.utc) + timedelta(
            minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES
        ),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    send_verification_email(user.email, user.username, code)

    return user


@router.post("/verify-email", response_model=Token)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account is already verified")
    if not user.verification_code or user.verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    if not user.verification_code_expires or datetime.now(timezone.utc) > user.verification_code_expires.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    db.commit()
    db.refresh(user)

    # Auto-login on successful verification for a smooth onboarding flow
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return Token(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/resend-verification")
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Avoid leaking which emails are registered
        return {"message": "If that email is registered and unverified, a new code has been sent."}
    if user.is_verified:
        return {"message": "This account is already verified. Please log in."}

    code = _generate_verification_code()
    user.verification_code = code
    user.verification_code_expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES
    )
    db.commit()
    send_verification_email(user.email, user.username, code)
    return {"message": "A new verification code has been sent to your email."}


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in. Check your inbox for the code, "
                   "or request a new one.",
        )

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return Token(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == int(data["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access = create_access_token({"sub": str(user.id), "role": user.role})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    return Token(access_token=new_access, refresh_token=new_refresh, user=user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # Stateless JWT: client discards tokens. Endpoint kept for API completeness.
    return {"message": f"User '{current_user.username}' logged out successfully"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return 200 to avoid leaking which emails are registered
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        # Uses the same email utility as verification: real SMTP if configured,
        # otherwise simulated via console output.
        from app.services.email_service import send_email
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        send_email(
            user.email,
            "Reset your WaveNet password",
            f"Hi {user.username},\n\nClick the link below to reset your password "
            f"(expires in 1 hour):\n\n{reset_link}\n\nIf you didn't request this, ignore this email.",
        )
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == payload.token).first()
    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if datetime.now(timezone.utc) > user.reset_token_expires.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password has been reset successfully"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
