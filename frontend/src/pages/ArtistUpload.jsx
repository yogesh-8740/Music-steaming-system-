import React, { useEffect, useState } from "react";
import { FiUploadCloud, FiMusic, FiImage } from "react-icons/fi";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

export default function ArtistUpload() {
  const [genres, setGenres] = useState([]);
  const [title, setTitle] = useState("");
  const [genreId, setGenreId] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    api.get("/genres").then(({ data }) => setGenres(data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) {
      showToast("Please select an audio file (mp3 or wav)", "error");
      return;
    }
    const formData = new FormData();
    formData.append("title", title);
    if (genreId) formData.append("genre_id", genreId);
    formData.append("audio_file", audioFile);
    if (coverFile) formData.append("cover_art", coverFile);

    setUploading(true);
    setProgress(0);
    try {
      await api.post("/songs/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          setProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      });
      showToast("Song uploaded successfully! It's now live on the network.", "success");
      setTitle("");
      setGenreId("");
      setAudioFile(null);
      setCoverFile(null);
      e.target.reset();
    } catch (err) {
      showToast(err.response?.data?.detail || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 pb-28 max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-1">Upload Music</h1>
      <p className="text-textmuted mb-8 text-sm">
        Anyone can upload — your track is automatically distributed to one of the 5 storage nodes
        for load balancing, and you can stream it back anytime from "My Uploads."
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="text-xs text-textmuted mb-1 block">Song Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>

        <div>
          <label className="text-xs text-textmuted mb-1 block">Genre</label>
          <select
            value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
          >
            <option value="">Select genre (optional)</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-textmuted mb-1 block">Audio File (.mp3 or .wav)</label>
          <label className="flex items-center gap-3 border border-dashed border-surface-border rounded-md px-4 py-6 cursor-pointer hover:border-brand-green transition-colors">
            <FiMusic size={22} className="text-textmuted shrink-0" />
            <span className="text-sm text-textmuted truncate">
              {audioFile ? audioFile.name : "Click to select an audio file"}
            </span>
            <input
              type="file" accept=".mp3,.wav" required hidden
              onChange={(e) => setAudioFile(e.target.files[0])}
            />
          </label>
        </div>

        <div>
          <label className="text-xs text-textmuted mb-1 block">Cover Art (optional)</label>
          <label className="flex items-center gap-3 border border-dashed border-surface-border rounded-md px-4 py-6 cursor-pointer hover:border-brand-green transition-colors">
            <FiImage size={22} className="text-textmuted shrink-0" />
            <span className="text-sm text-textmuted truncate">
              {coverFile ? coverFile.name : "Click to select cover image"}
            </span>
            <input
              type="file" accept=".jpg,.jpeg,.png,.webp" hidden
              onChange={(e) => setCoverFile(e.target.files[0])}
            />
          </label>
        </div>

        {uploading && (
          <div className="w-full bg-surface-card rounded-full h-2 overflow-hidden">
            <div className="bg-brand-green h-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full py-3 text-sm disabled:opacity-60"
        >
          <FiUploadCloud size={16} />
          {uploading ? `Uploading... ${progress}%` : "Upload Song"}
        </button>
      </form>
    </div>
  );
}
