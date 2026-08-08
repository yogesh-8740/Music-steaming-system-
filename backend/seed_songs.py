"""
Seeds the platform with 12-15 demo songs so the app isn't empty for a demo.

Two modes, auto-detected:
1. If you drop your own legally-owned MP3/WAV files into backend/sample_songs/,
   those are used directly (filename becomes the song title).
2. Otherwise, this script SYNTHESIZES original short instrumental tracks
   (simple pentatonic melodies rendered as WAV) with original Bollywood-style
   demo titles. These are NOT copies of any real copyrighted song - just
   generated tones - so the platform can be fully populated and demoed
   without distributing anyone else's copyrighted audio.

Run with:
    cd backend
    python seed_songs.py
"""
import io
import math
import random
import wave
import struct
from pathlib import Path

from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.core.config import settings
from app.models.user import User
from app.models.music_meta import Genre
from app.models.song import Song
from app.services import storage_manager
from app.utils.audio_meta import estimate_duration
import app.models  # noqa: F401

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

SAMPLE_RATE = 22050

# Original, non-copyrighted demo titles in a Bollywood/romantic-pop style.
DEMO_TRACKS = [
    {"title": "Dil Ki Dastaan", "genre": "Bollywood", "mood": "romantic"},
    {"title": "Rangeen Sapne", "genre": "Bollywood", "mood": "upbeat"},
    {"title": "Yaadon Ki Bahaar", "genre": "Bollywood", "mood": "nostalgic"},
    {"title": "Mohabbat Ka Rang", "genre": "Bollywood", "mood": "romantic"},
    {"title": "Sunehri Shaam", "genre": "Bollywood", "mood": "calm"},
    {"title": "Dilon Ka Mela", "genre": "Bollywood", "mood": "upbeat"},
    {"title": "Chandni Raatein", "genre": "Bollywood", "mood": "calm"},
    {"title": "Zindagi Ka Safar", "genre": "Bollywood", "mood": "epic"},
    {"title": "Ishq Ki Baarish", "genre": "Bollywood", "mood": "romantic"},
    {"title": "Sitaron Ki Mehfil", "genre": "Bollywood", "mood": "calm"},
    {"title": "Khushiyon Ka Jahan", "genre": "Bollywood", "mood": "upbeat"},
    {"title": "Pyaar Ka Tarana", "genre": "Bollywood", "mood": "romantic"},
    {"title": "Ummeedon Ka Safar", "genre": "Pop", "mood": "epic"},
    {"title": "Rangoli Ki Raat", "genre": "Bollywood", "mood": "upbeat"},
]

# Pentatonic scale frequencies (Hz) - always sounds pleasant regardless of order
SCALE = {
    "romantic": [261.6, 293.7, 349.2, 392.0, 440.0],      # C D F G A
    "upbeat":   [293.7, 329.6, 392.0, 440.0, 523.3],       # D E G A C
    "nostalgic":[246.9, 293.7, 329.6, 392.0, 440.0],       # B D E G A
    "calm":     [220.0, 246.9, 293.7, 329.6, 392.0],       # A B D E G
    "epic":     [196.0, 220.0, 261.6, 293.7, 349.2],       # G A C D F
}

COVER_COLORS = [
    ("#8E2DE2", "#4A00E0"), ("#F953C6", "#B91D73"), ("#00C9FF", "#92FE9D"),
    ("#F857A6", "#FF5858"), ("#00B4DB", "#0083B0"), ("#FC5C7D", "#6A82FB"),
    ("#DA22FF", "#9733EE"), ("#F7971E", "#FFD200"),
]


def synthesize_melody(mood: str, duration_seconds: float = 22.0) -> bytes:
    """Generates a simple pleasant instrumental melody as raw 16-bit PCM WAV bytes."""
    scale = SCALE.get(mood, SCALE["calm"])
    n_samples = int(SAMPLE_RATE * duration_seconds)
    note_duration = 0.6  # seconds per note
    samples_per_note = int(SAMPLE_RATE * note_duration)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)

        frames = bytearray()
        t_total = 0
        rng = random.Random(mood + str(duration_seconds))
        while t_total < n_samples:
            freq = rng.choice(scale)
            # occasionally jump an octave for variety
            if rng.random() < 0.2:
                freq *= 2
            for i in range(samples_per_note):
                if t_total >= n_samples:
                    break
                t = i / SAMPLE_RATE
                # simple envelope: quick attack, slow decay for a plucked feel
                envelope = min(1.0, t * 20) * math.exp(-t * 2.2)
                # add a soft harmonic overtone for a fuller sound
                value = 0.6 * math.sin(2 * math.pi * freq * t) + 0.2 * math.sin(2 * math.pi * freq * 2 * t)
                sample = int(max(-1.0, min(1.0, value * envelope)) * 12000)
                frames += struct.pack("<h", sample)
                t_total += 1
        wf.writeframes(bytes(frames))

    return buffer.getvalue()


def generate_cover_art(title: str, index: int) -> bytes | None:
    if not PIL_AVAILABLE:
        return None
    color1, color2 = COVER_COLORS[index % len(COVER_COLORS)]
    size = 500
    img = Image.new("RGB", (size, size), color1)
    draw = ImageDraw.Draw(img)
    # simple diagonal gradient effect
    c1 = tuple(int(color1.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    c2 = tuple(int(color2.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    for y in range(size):
        ratio = y / size
        r = int(c1[0] + (c2[0] - c1[0]) * ratio)
        g = int(c1[1] + (c2[1] - c1[1]) * ratio)
        b = int(c1[2] + (c2[2] - c1[2]) * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b))

    # draw a simple music-note glyph + title initial
    draw.ellipse((180, 300, 240, 360), fill="white")
    draw.ellipse((280, 260, 340, 320), fill="white")
    draw.rectangle((235, 150, 245, 330), fill="white")
    draw.rectangle((335, 120, 345, 290), fill="white")

    try:
        font = ImageFont.load_default()
        draw.text((30, 30), title[:22], fill="white", font=font)
    except Exception:
        pass

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85)
    return out.getvalue()


def seed_songs():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        storage_manager.bootstrap_storage_nodes(db)

        # Ensure genres exist
        genre_cache = {}
        for name in {"Bollywood", "Pop"}:
            genre = db.query(Genre).filter(Genre.name == name).first()
            if not genre:
                genre = Genre(name=name, description=f"{name} music")
                db.add(genre)
                db.commit()
                db.refresh(genre)
            genre_cache[name] = genre

        # Ensure a demo artist account exists to own these uploads
        artist = db.query(User).filter(User.username == "demo_artist").first()
        if not artist:
            artist = User(
                username="demo_artist",
                email="demo_artist@wavenet.com",
                full_name="WaveNet Studio",
                hashed_password=hash_password("Artist@123"),
                role="artist",
                is_verified=True,
            )
            db.add(artist)
            db.commit()
            db.refresh(artist)
            print("✅ Created demo artist -> username: demo_artist | password: Artist@123")

        covers_dir = settings.uploads_abs_path / "covers"
        covers_dir.mkdir(parents=True, exist_ok=True)

        sample_dir = Path(__file__).resolve().parent / "sample_songs"
        user_files = sorted(
            [f for f in sample_dir.glob("*") if f.suffix.lower() in (".mp3", ".wav")]
        ) if sample_dir.exists() else []

        created = 0

        if user_files:
            print(f"🎧 Found {len(user_files)} user-provided audio file(s) in sample_songs/ — using those.")
            for i, filepath in enumerate(user_files):
                title = filepath.stem.replace("_", " ").title()
                if db.query(Song).filter(Song.title == title, Song.artist_id == artist.id).first():
                    continue

                node = storage_manager.select_node(db)
                if not node:
                    print("⚠️  No storage nodes available, stopping.")
                    break
                ext = filepath.suffix.lower().lstrip(".")
                unique_name = f"song_{artist.id}_{i}_{filepath.stem[:20].replace(' ', '_')}.{ext}"
                dest_path = Path(node.folder_path) / unique_name
                dest_path.write_bytes(filepath.read_bytes())

                file_size_mb = round(dest_path.stat().st_size / (1024 * 1024), 3)
                duration = estimate_duration(dest_path, ext)
                storage_manager.update_node_stats_after_upload(db, node, file_size_mb)

                song = Song(
                    title=title,
                    artist_id=artist.id,
                    genre_id=genre_cache["Bollywood"].id,
                    file_name=unique_name,
                    file_format=ext,
                    file_size_mb=file_size_mb,
                    duration_seconds=duration,
                    storage_node_id=node.id,
                    play_count=random.randint(5, 500),
                    like_count=random.randint(0, 80),
                )
                db.add(song)
                db.commit()
                created += 1
                print(f"  + {title} ({ext.upper()}, {duration:.0f}s) -> {node.name}")
        else:
            print("🎼 No files in sample_songs/ — generating original synthetic demo tracks instead.")
            for i, track in enumerate(DEMO_TRACKS):
                if db.query(Song).filter(Song.title == track["title"], Song.artist_id == artist.id).first():
                    continue

                node = storage_manager.select_node(db)
                if not node:
                    print("⚠️  No storage nodes available, stopping.")
                    break

                duration = random.uniform(18, 28)
                audio_bytes = synthesize_melody(track["mood"], duration)
                unique_name = f"song_demo_{i}_{track['title'].replace(' ', '_')}.wav"
                dest_path = Path(node.folder_path) / unique_name
                dest_path.write_bytes(audio_bytes)

                file_size_mb = round(len(audio_bytes) / (1024 * 1024), 3)
                real_duration = estimate_duration(dest_path, "wav")
                storage_manager.update_node_stats_after_upload(db, node, file_size_mb)

                cover_path_str = None
                cover_bytes = generate_cover_art(track["title"], i)
                if cover_bytes:
                    cover_filename = f"cover_demo_{i}.jpg"
                    (covers_dir / cover_filename).write_bytes(cover_bytes)
                    cover_path_str = f"covers/{cover_filename}"

                song = Song(
                    title=track["title"],
                    artist_id=artist.id,
                    genre_id=genre_cache.get(track["genre"], genre_cache["Bollywood"]).id,
                    file_name=unique_name,
                    file_format="wav",
                    file_size_mb=file_size_mb,
                    duration_seconds=real_duration,
                    storage_node_id=node.id,
                    cover_art_path=cover_path_str,
                    play_count=random.randint(5, 500),
                    like_count=random.randint(0, 80),
                )
                db.add(song)
                db.commit()
                created += 1
                print(f"  + {track['title']} (WAV, {real_duration:.0f}s) -> {node.name}")

        print(f"🎉 Seeded {created} song(s). Total songs in DB: {db.query(Song).count()}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_songs()
