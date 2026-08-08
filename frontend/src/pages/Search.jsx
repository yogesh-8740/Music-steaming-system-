import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import SongRow from "../components/common/SongRow";
import { RowSkeleton } from "../components/common/Skeletons";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popularity", label: "Most Liked" },
  { value: "most_played", label: "Most Played" },
];

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [sortBy, setSortBy] = useState("newest");
  const [genres, setGenres] = useState([]);
  const [genreId, setGenreId] = useState("");
  const [results, setResults] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const { playQueue, currentSong, isPlaying } = usePlayer();
  const { showToast } = useToast();

  useEffect(() => {
    api.get("/genres").then(({ data }) => setGenres(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (genreId) params.set("genre_id", genreId);
        params.set("sort_by", sortBy);
        params.set("limit", "50");

        const [songsRes, favRes] = await Promise.all([
          api.get(`/songs?${params.toString()}`),
          api.get("/favorites").catch(() => ({ data: [] })),
        ]);
        setResults(songsRes.data);
        setFavoriteIds(new Set(favRes.data.map((s) => s.id)));
      } catch {
        showToast("Search failed", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, genreId, sortBy]);

  const handleLike = async (song) => {
    try {
      if (favoriteIds.has(song.id)) {
        await api.delete(`/favorites/${song.id}`);
        setFavoriteIds((prev) => { const n = new Set(prev); n.delete(song.id); return n; });
      } else {
        await api.post(`/favorites/${song.id}`);
        setFavoriteIds((prev) => new Set(prev).add(song.id));
      }
    } catch {
      showToast("Failed to update favorite", "error");
    }
  };

  return (
    <div className="p-6 pb-28">
      <h1 className="text-2xl font-bold text-white mb-4">{q ? `Results for "${q}"` : "Browse All Songs"}</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={genreId}
          onChange={(e) => setGenreId(e.target.value)}
          className="bg-surface-card border border-surface-border rounded-full px-4 py-1.5 text-sm text-white"
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
              sortBy === opt.value
                ? "bg-brand-green text-black border-brand-green font-medium"
                : "border-surface-border text-textmuted hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
        ) : results.length === 0 ? (
          <p className="text-textmuted text-sm mt-6">No songs found. Try a different search or filter.</p>
        ) : (
          results.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              isCurrent={currentSong?.id === song.id}
              isPlaying={isPlaying}
              onPlay={(s) => playQueue(results, i)}
              onLike={handleLike}
              isFavorite={favoriteIds.has(song.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
