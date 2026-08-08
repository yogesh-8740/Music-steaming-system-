"""
Content-based recommendation engine using scikit-learn.

Builds a simple feature vector per song from genre_id and artist_id
(one-hot encoded) plus normalized play_count/like_count, then uses
cosine similarity against the user's listening history + favorites
to recommend similar songs they haven't already played.

This is intentionally a lightweight content-based approach (not
collaborative filtering) so it works well even with a small/fresh
dataset typical of a local FYP demo.
"""
from typing import List
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from app.models.song import Song
from app.models.activity import Favorite, ListeningHistory


def _build_feature_matrix(songs: List[Song]) -> np.ndarray:
    if not songs:
        return np.array([])

    genre_ids = sorted({s.genre_id for s in songs if s.genre_id is not None})
    artist_ids = sorted({s.artist_id for s in songs})

    genre_index = {g: i for i, g in enumerate(genre_ids)}
    artist_index = {a: i for i, a in enumerate(artist_ids)}

    max_plays = max((s.play_count for s in songs), default=1) or 1
    max_likes = max((s.like_count for s in songs), default=1) or 1

    n_features = len(genre_ids) + len(artist_ids) + 2
    matrix = np.zeros((len(songs), n_features))

    for row, song in enumerate(songs):
        if song.genre_id is not None and song.genre_id in genre_index:
            matrix[row, genre_index[song.genre_id]] = 1.0
        matrix[row, len(genre_ids) + artist_index[song.artist_id]] = 1.0
        matrix[row, -2] = song.play_count / max_plays
        matrix[row, -1] = song.like_count / max_likes

    return matrix


def get_recommendations_for_user(db: Session, user_id: int, limit: int = 10) -> List[Song]:
    all_songs = db.query(Song).all()
    if len(all_songs) < 2:
        return all_songs

    # Determine the user's "seed" songs: favorites + recently played
    fav_song_ids = {f.song_id for f in db.query(Favorite).filter(Favorite.user_id == user_id).all()}
    history_song_ids = {
        h.song_id for h in
        db.query(ListeningHistory).filter(ListeningHistory.user_id == user_id).limit(50).all()
    }
    seed_ids = fav_song_ids | history_song_ids

    if not seed_ids:
        # Cold start: no history yet -> return most popular songs
        return sorted(all_songs, key=lambda s: (s.play_count, s.like_count), reverse=True)[:limit]

    feature_matrix = _build_feature_matrix(all_songs)
    song_id_to_row = {s.id: i for i, s in enumerate(all_songs)}

    seed_rows = [song_id_to_row[sid] for sid in seed_ids if sid in song_id_to_row]
    if not seed_rows:
        return sorted(all_songs, key=lambda s: (s.play_count, s.like_count), reverse=True)[:limit]

    seed_vector = feature_matrix[seed_rows].mean(axis=0).reshape(1, -1)
    similarities = cosine_similarity(seed_vector, feature_matrix)[0]

    scored = [
        (all_songs[i], similarities[i])
        for i in range(len(all_songs))
        if all_songs[i].id not in seed_ids
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    return [song for song, _score in scored[:limit]]
