from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.song import SongOut
from app.services.recommendation import get_recommendations_for_user

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("", response_model=List[SongOut])
def get_recommendations(limit: int = Query(10, le=50), db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    return get_recommendations_for_user(db, current_user.id, limit)
