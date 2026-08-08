import React from "react";
import {
  FiChevronDown, FiPlay, FiPause, FiSkipBack, FiSkipForward,
  FiShuffle, FiRepeat, FiHeart,
} from "react-icons/fi";
import { usePlayer } from "../../context/PlayerContext";
import { SERVER_ROOT } from "../../services/api";
import WaveformVisualizer from "./WaveformVisualizer";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function FullScreenPlayer({ onLikeCurrent, isFavorite }) {
  const {
    currentSong, isPlaying, progress, duration, shuffle, repeatMode,
    togglePlayPause, playNext, playPrevious, seek, toggleShuffle, cycleRepeat,
    isFullScreen, setIsFullScreen,
  } = usePlayer();

  if (!isFullScreen || !currentSong) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-surface-raised to-surface-base flex flex-col items-center justify-center p-8 animate-fadeIn">
      <button
        onClick={() => setIsFullScreen(false)}
        className="absolute top-6 left-6 text-textmuted hover:text-white flex items-center gap-2"
      >
        <FiChevronDown size={24} />
        <span className="text-sm">Minimize</span>
      </button>

      <div className="w-72 h-72 md:w-96 md:h-96 rounded-xl overflow-hidden shadow-2xl bg-surface-card mb-8">
        {currentSong.cover_art_path ? (
          <img
            src={`${SERVER_ROOT}/uploads/${currentSong.cover_art_path}`}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">🎵</div>
        )}
      </div>

      <div className="text-center mb-6 max-w-md">
        <h2 className="text-2xl font-bold text-white truncate">{currentSong.title}</h2>
        <p className="text-textmuted mt-1">{currentSong.artist_username || "Unknown Artist"}</p>
      </div>

      <div className="w-full max-w-md h-16 mb-6">
        <WaveformVisualizer />
      </div>

      <div className="w-full max-w-md flex items-center gap-2 mb-4">
        <span className="text-xs text-textmuted w-9 text-right">{formatTime(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={progress}
          onChange={(e) => seek(Number(e.target.value))}
          className="flex-1"
          style={{
            background: `linear-gradient(to right, #1DB954 ${(progress / (duration || 1)) * 100}%, #4d4d4d 0%)`,
          }}
        />
        <span className="text-xs text-textmuted w-9">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-6">
        <button onClick={toggleShuffle} className={shuffle ? "text-brand-green" : "text-textmuted hover:text-white"}>
          <FiShuffle size={20} />
        </button>
        <button onClick={playPrevious} className="text-white hover:scale-110 transition-transform">
          <FiSkipBack size={26} />
        </button>
        <button
          onClick={togglePlayPause}
          className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
        >
          {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} className="ml-1" />}
        </button>
        <button onClick={playNext} className="text-white hover:scale-110 transition-transform">
          <FiSkipForward size={26} />
        </button>
        <button
          onClick={cycleRepeat}
          className={repeatMode !== "off" ? "text-brand-green" : "text-textmuted hover:text-white"}
        >
          <FiRepeat size={20} />
        </button>
        {onLikeCurrent && (
          <button onClick={() => onLikeCurrent(currentSong)}>
            <FiHeart size={20} className={isFavorite ? "fill-brand-green text-brand-green" : "text-textmuted hover:text-white"} />
          </button>
        )}
      </div>
    </div>
  );
}
