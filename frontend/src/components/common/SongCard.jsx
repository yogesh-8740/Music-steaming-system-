import React from "react";
import { FiPlay, FiHeart } from "react-icons/fi";
import { SERVER_ROOT } from "../../services/api";

export default function SongCard({ song, onPlay, onLike, isFavorite }) {
  return (
    <div className="group relative p-3 rounded-lg bg-surface-card hover:bg-surface-hover transition-colors cursor-pointer animate-fadeIn">
      <div className="relative w-full aspect-square rounded-md overflow-hidden mb-3 bg-surface-hover">
        {song.cover_art_path ? (
          <img
            src={`${SERVER_ROOT}/uploads/${song.cover_art_path}`}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-textmuted">🎵</div>
        )}
        <button
          onClick={() => onPlay(song)}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-brand-green text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-lg"
        >
          <FiPlay size={16} className="ml-0.5" />
        </button>
      </div>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{song.title}</p>
          <p className="text-xs text-textmuted truncate">{song.artist_username || "Unknown Artist"}</p>
        </div>
        {onLike && (
          <button onClick={() => onLike(song)} className="shrink-0 mt-0.5">
            <FiHeart
              size={15}
              className={isFavorite ? "fill-brand-green text-brand-green" : "text-textmuted hover:text-white"}
            />
          </button>
        )}
      </div>
    </div>
  );
}
