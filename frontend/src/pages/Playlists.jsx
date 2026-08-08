import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiMusic } from "react-icons/fi";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    api.get("/playlists/mine")
      .then(({ data }) => setPlaylists(data))
      .catch(() => showToast("Failed to load playlists", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post("/playlists", { name: name.trim(), is_public: isPublic });
      showToast("Playlist created", "success");
      setShowModal(false);
      setName("");
      setIsPublic(false);
      load();
    } catch {
      showToast("Failed to create playlist", "error");
    }
  };

  return (
    <div className="p-6 pb-28">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Your Playlists</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full px-4 py-2 text-sm"
        >
          <FiPlus size={16} /> New Playlist
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-lg" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <p className="text-textmuted text-sm">You haven't created any playlists yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.map((p) => (
            <Link
              key={p.id}
              to={`/library/playlists/${p.id}`}
              className="p-3 rounded-lg bg-surface-card hover:bg-surface-hover transition-colors"
            >
              <div className="w-full aspect-square rounded-md bg-surface-hover flex items-center justify-center mb-3">
                <FiMusic size={28} className="text-textmuted" />
              </div>
              <p className="text-sm font-semibold text-white truncate">{p.name}</p>
              <p className="text-xs text-textmuted">{p.is_public ? "Public" : "Private"}</p>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="glass rounded-xl p-6 w-full max-w-sm animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Create Playlist</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <input
                autoFocus required placeholder="Playlist name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
              <label className="flex items-center gap-2 text-sm text-textmuted">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                Make this playlist public
              </label>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-textmuted hover:text-white">
                  Cancel
                </button>
                <button type="submit" className="bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full px-4 py-2 text-sm">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
