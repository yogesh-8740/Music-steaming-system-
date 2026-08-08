import React, { useEffect, useState } from "react";
import { FiMusic, FiUploadCloud } from "react-icons/fi";
import { Link } from "react-router-dom";
import api from "../services/api";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import SongRow from "../components/common/SongRow";
import { RowSkeleton } from "../components/common/Skeletons";

export default function MyUploads() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playQueue, currentSong, isPlaying } = usePlayer();
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    api.get("/songs/my/uploads")
      .then(({ data }) => setSongs(data))
      .catch(() => showToast("Failed to load your uploads", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (song) => {
    if (!window.confirm(`Delete "${song.title}" permanently?`)) return;
    try {
      await api.delete(`/songs/${song.id}`);
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      showToast("Song deleted", "success");
    } catch {
      showToast("Failed to delete song", "error");
    }
  };

  return (
    <div className="p-6 pb-28">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-pink-500 to-brand-green flex items-center justify-center shadow-lg">
            <FiMusic size={30} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-textmuted uppercase tracking-wide">Your Uploads</p>
            <h1 className="text-3xl font-bold text-white">My Music</h1>
            <p className="text-sm text-textmuted mt-1">{songs.length} songs on the network</p>
          </div>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-2 bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full px-4 py-2 text-sm shrink-0"
        >
          <FiUploadCloud size={16} /> Upload
        </Link>
      </div>

      <div className="flex flex-col">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)
        ) : songs.length === 0 ? (
          <p className="text-textmuted text-sm">
            You haven't uploaded any songs yet. Any listener can upload their own tracks and stream
            them anytime — try it from the "Upload Music" tab.
          </p>
        ) : (
          songs.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              isCurrent={currentSong?.id === song.id}
              isPlaying={isPlaying}
              onPlay={() => playQueue(songs, i)}
              onRemove={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
