import React, { useEffect, useState } from "react";
import { FiHeart } from "react-icons/fi";
import api from "../services/api";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import SongRow from "../components/common/SongRow";
import { RowSkeleton } from "../components/common/Skeletons";

export default function Favorites() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playQueue, currentSong, isPlaying } = usePlayer();
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    api.get("/favorites")
      .then(({ data }) => setSongs(data))
      .catch(() => showToast("Failed to load favorites", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnlike = async (song) => {
    try {
      await api.delete(`/favorites/${song.id}`);
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
    } catch {
      showToast("Failed to remove favorite", "error");
    }
  };

  return (
    <div className="p-6 pb-28">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-600 to-brand-green flex items-center justify-center shadow-lg">
          <FiHeart size={32} className="text-white fill-white" />
        </div>
        <div>
          <p className="text-xs text-textmuted uppercase tracking-wide">Playlist</p>
          <h1 className="text-3xl font-bold text-white">Liked Songs</h1>
          <p className="text-sm text-textmuted mt-1">{songs.length} songs</p>
        </div>
      </div>

      <div className="flex flex-col">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
        ) : songs.length === 0 ? (
          <p className="text-textmuted text-sm">Songs you like will appear here. Tap the heart icon on any song.</p>
        ) : (
          songs.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              isCurrent={currentSong?.id === song.id}
              isPlaying={isPlaying}
              onPlay={() => playQueue(songs, i)}
              onLike={handleUnlike}
              isFavorite={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
