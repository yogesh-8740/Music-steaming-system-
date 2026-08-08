from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin, require_artist
from app.core.config import settings
from app.models.user import User
from app.models.music_meta import Genre, Album
from app.schemas.song import GenreOut, GenreCreate, AlbumOut, AlbumCreate
from app.utils.file_validation import validate_image_file, validate_file_size

router = APIRouter(tags=["Catalog"])


# ---------------- Genres ----------------

@router.get("/genres", response_model=List[GenreOut])
def list_genres(db: Session = Depends(get_db)):
    return db.query(Genre).order_by(Genre.name).all()


@router.post("/genres", response_model=GenreOut, status_code=201)
def create_genre(payload: GenreCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(require_admin)):
    if db.query(Genre).filter(Genre.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Genre already exists")
    genre = Genre(name=payload.name, description=payload.description)
    db.add(genre)
    db.commit()
    db.refresh(genre)
    return genre


@router.delete("/genres/{genre_id}")
def delete_genre(genre_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(require_admin)):
    genre = db.query(Genre).filter(Genre.id == genre_id).first()
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")
    db.delete(genre)
    db.commit()
    return {"message": "Genre deleted"}


# ---------------- Albums ----------------

@router.get("/albums", response_model=List[AlbumOut])
def list_albums(db: Session = Depends(get_db)):
    return db.query(Album).order_by(Album.created_at.desc()).all()


@router.post("/albums", response_model=AlbumOut, status_code=201)
async def create_album(
    title: str = Form(...),
    release_year: Optional[int] = Form(None),
    cover_art: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_artist),
):
    cover_path_str = None
    if cover_art:
        ext = validate_image_file(cover_art)
        contents = await cover_art.read()
        validate_file_size(len(contents))
        covers_dir = settings.uploads_abs_path / "covers"
        covers_dir.mkdir(parents=True, exist_ok=True)
        filename = f"album_{uuid.uuid4().hex[:8]}.{ext}"
        with open(covers_dir / filename, "wb") as f:
            f.write(contents)
        cover_path_str = f"covers/{filename}"

    album = Album(title=title, artist_id=current_user.id, release_year=release_year,
                   cover_art_path=cover_path_str)
    db.add(album)
    db.commit()
    db.refresh(album)
    return album


@router.delete("/albums/{album_id}")
def delete_album(album_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(require_artist)):
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    if album.artist_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(album)
    db.commit()
    return {"message": "Album deleted"}
