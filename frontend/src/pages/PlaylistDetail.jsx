import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiMusic, FiEdit2, FiTrash2, FiPlay } from "react-icons/fi";
import api from "../services/api";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import SongRow from "../components/common/SongRow";
import { RowSkeleton } from "../components/common/Skeletons";

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playQueue, currentSong, isPlaying } = usePlayer();
  const { showToast } = useToast();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const load = () => {
    setLoading(true);
    api.get(`/playlists/${id}`)
      .then(({ data }) => { setPlaylist(data); setNameDraft(data.name); })
      .catch(() => showToast("Failed to load playlist", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOwner = playlist && user && (playlist.owner_id === user.id || user.role === "admin");

  const handleRename = async () => {
    try {
      await api.put(`/playlists/${id}`, { name: nameDraft });
      setPlaylist((p) => ({ ...p, name: nameDraft }));
      setEditing(false);
      showToast("Playlist renamed", "success");
    } catch {
      showToast("Failed to rename playlist", "error");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this playlist? This can't be undone.")) return;
    try {
      await api.delete(`/playlists/${id}`);
      showToast("Playlist deleted", "success");
      navigate("/library/playlists");
    } catch {
      showToast("Failed to delete playlist", "error");
    }
  };

  const handleRemoveSong = async (song) => {
    try {
      await api.delete(`/playlists/${id}/songs/${song.id}`);
      setPlaylist((p) => ({ ...p, songs: p.songs.filter((s) => s.id !== song.id) }));
    } catch {
      showToast("Failed to remove song", "error");
    }
  };

  if (loading) {
    return (
      <div className="p-6 pb-28">
        <div className="skeleton w-20 h-20 rounded-lg mb-6" />
        {Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
      </div>
    );
  }

  if (!playlist) return null;

  return (
    <div className="p-6 pb-28">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-orange-500 to-brand-green flex items-center justify-center shadow-lg shrink-0">
          <FiMusic size={30} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-textmuted uppercase tracking-wide">{playlist.is_public ? "Public Playlist" : "Private Playlist"}</p>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className="text-2xl font-bold bg-surface-card border border-surface-border rounded px-2 py-1 text-white"
              />
              <button onClick={handleRename} className="text-brand-green text-sm">Save</button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-white truncate">{playlist.name}</h1>
          )}
          <p className="text-sm text-textmuted mt-1">{playlist.songs.length} songs</p>
        </div>
        {isOwner && !editing && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditing(true)} className="p-2 text-textmuted hover:text-white" title="Rename">
              <FiEdit2 size={16} />
            </button>
            <button onClick={handleDelete} className="p-2 text-textmuted hover:text-red-400" title="Delete">
              <FiTrash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {playlist.songs.length > 0 && (
        <button
          onClick={() => playQueue(playlist.songs, 0)}
          className="flex items-center gap-2 bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full px-6 py-2.5 text-sm mb-6"
        >
          <FiPlay size={16} /> Play All
        </button>
      )}

      <div className="flex flex-col">
        {playlist.songs.length === 0 ? (
          <p className="text-textmuted text-sm">This playlist is empty. Add songs from the search page.</p>
        ) : (
          playlist.songs.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              isCurrent={currentSong?.id === song.id}
              isPlaying={isPlaying}
              onPlay={() => playQueue(playlist.songs, i)}
              onRemove={isOwner ? handleRemoveSong : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
