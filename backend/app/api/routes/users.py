import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserUpdate, UserOut
from app.utils.file_validation import validate_image_file, validate_file_size

router = APIRouter(prefix="/users", tags=["Users"])


@router.put("/me", response_model=UserOut)
def update_profile(payload: UserUpdate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.bio is not None:
        current_user.bio = payload.bio
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    ext = validate_image_file(file)
    contents = await file.read()
    validate_file_size(len(contents))

    avatars_dir = settings.uploads_abs_path / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)

    filename = f"user_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    dest = avatars_dir / filename
    with open(dest, "wb") as f:
        f.write(contents)

    current_user.avatar_path = f"avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=UserOut)
def get_public_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
