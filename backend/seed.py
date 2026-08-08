"""
Seed script: creates a default admin account and a starter set of
genres so the app isn't empty on first run.

Run with:
    cd backend
    python seed.py
"""
from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User
from app.models.music_meta import Genre
from app.services.storage_manager import bootstrap_storage_nodes
import app.models  # noqa: F401

DEFAULT_GENRES = [
    "Pop", "Rock", "Hip Hop", "Jazz", "Classical",
    "Electronic", "R&B", "Country", "Reggae", "Lo-Fi",
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bootstrap_storage_nodes(db)

        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                email="admin@wavenet.com",
                full_name="System Administrator",
                hashed_password=hash_password("Admin@123"),
                role="admin",
                is_verified=True,
            )
            db.add(admin)
            print("✅ Created default admin -> username: admin | password: Admin@123")
        else:
            print("ℹ️  Admin user already exists, skipping.")

        for name in DEFAULT_GENRES:
            if not db.query(Genre).filter(Genre.name == name).first():
                db.add(Genre(name=name))

        db.commit()
        print("✅ Seeded default genres.")
        print("🎉 Database seeding complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
