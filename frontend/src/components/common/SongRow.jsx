import React from "react";
import { FiPlay, FiHeart, FiMoreHorizontal } from "react-icons/fi";
import { SERVER_ROOT } from "../../services/api";

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SongRow({ song, index, isCurrent, isPlaying, onPlay, onLike, isFavorite, onRemove }) {
  return (
    <div
      className={`group flex items-center gap-4 px-3 py-2 rounded-md hover:bg-surface-hover transition-colors ${
        isCurrent ? "bg-surface-hover" : ""
      }`}
    >
      <div className="w-6 text-center text-sm text-textmuted shrink-0">
        {isCurrent && isPlaying ? (
          <div className="flex gap-0.5 justify-center items-end h-3">
            <span className="w-0.5 bg-brand-green animate-pulse" style={{ height: "60%" }} />
            <span className="w-0.5 bg-brand-green animate-pulse" style={{ height: "100%" }} />
            <span className="w-0.5 bg-brand-green animate-pulse" style={{ height: "40%" }} />
          </div>
        ) : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <button onClick={() => onPlay(song)} className="hidden group-hover:inline-flex">
              <FiPlay size={13} className="text-white" />
            </button>
          </>
        )}
      </div>

      <div className="w-10 h-10 rounded overflow-hidden bg-surface-hover shrink-0">
        {song.cover_art_path ? (
          <img src={`${SERVER_ROOT}/uploads/${song.cover_art_path}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm">🎵</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrent ? "text-brand-green" : "text-white"}`}>{song.title}</p>
        <p className="text-xs text-textmuted truncate">{song.artist_username || "Unknown Artist"}</p>
      </div>

      {onLike && (
        <button onClick={() => onLike(song)} className="opacity-0 group-hover:opacity-100 transition-opacity">
          <FiHeart size={15} className={isFavorite ? "fill-brand-green text-brand-green" : "text-textmuted hover:text-white"} />
        </button>
      )}

      <span className="text-xs text-textmuted w-12 text-right shrink-0">{formatDuration(song.duration_seconds)}</span>

      {onRemove && (
        <button onClick={() => onRemove(song)} className="opacity-0 group-hover:opacity-100 text-textmuted hover:text-red-400">
          <FiMoreHorizontal size={16} />
        </button>
      )}
    </div>
  );
}
