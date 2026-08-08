import React, { useEffect, useState } from "react";
import { FiClock, FiTrash2 } from "react-icons/fi";
import api from "../services/api";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import SongRow from "../components/common/SongRow";
import { RowSkeleton } from "../components/common/Skeletons";

export default function History() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playQueue, currentSong, isPlaying } = usePlayer();
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    api.get("/history/recent?limit=50")
      .then(({ data }) => setSongs(data))
      .catch(() => showToast("Failed to load history", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = async () => {
    try {
      await api.delete("/history/clear");
      setSongs([]);
      showToast("Listening history cleared", "success");
    } catch {
      showToast("Failed to clear history", "error");
    }
  };

  return (
    <div className="p-6 pb-28">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-600 to-surface-hover flex items-center justify-center shadow-lg">
            <FiClock size={32} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-textmuted uppercase tracking-wide">Your Activity</p>
            <h1 className="text-3xl font-bold text-white">Recently Played</h1>
            <p className="text-sm text-textmuted mt-1">{songs.length} songs</p>
          </div>
        </div>
        {songs.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-2 text-sm text-textmuted hover:text-red-400 border border-surface-border rounded-full px-4 py-2"
          >
            <FiTrash2 size={14} /> Clear History
          </button>
        )}
      </div>

      <div className="flex flex-col">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
        ) : songs.length === 0 ? (
          <p className="text-textmuted text-sm">Songs you play will show up here.</p>
        ) : (
          songs.map((song, i) => (
            <SongRow
              key={`${song.id}-${i}`}
              song={song}
              index={i}
              isCurrent={currentSong?.id === song.id}
              isPlaying={isPlaying}
              onPlay={() => playQueue(songs, i)}
            />
          ))
        )}
      </div>
    </div>
  );
}
