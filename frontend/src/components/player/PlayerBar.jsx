import React from "react";
import {
  FiPlay, FiPause, FiSkipBack, FiSkipForward, FiShuffle, FiRepeat,
  FiVolume2, FiVolumeX, FiMaximize2, FiHeart,
} from "react-icons/fi";
import { usePlayer } from "../../context/PlayerContext";
import { SERVER_ROOT } from "../../services/api";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlayerBar({ onLikeCurrent, isFavorite }) {
  const {
    currentSong, isPlaying, progress, duration, volume, shuffle, repeatMode,
    togglePlayPause, playNext, playPrevious, seek, changeVolume,
    toggleShuffle, cycleRepeat, setIsFullScreen,
  } = usePlayer();

  if (!currentSong) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-surface-raised border-t border-surface-border flex items-center justify-center text-textmuted text-sm z-40">
        No song playing — pick something to start listening 🎶
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-surface-raised border-t border-surface-border px-4 flex items-center gap-4 z-40">
      {/* Song info */}
      <div className="flex items-center gap-3 w-1/4 min-w-0">
        <div className="w-12 h-12 rounded overflow-hidden bg-surface-hover shrink-0">
          {currentSong.cover_art_path ? (
            <img src={`${SERVER_ROOT}/uploads/${currentSong.cover_art_path}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">🎵</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
          <p className="text-xs text-textmuted truncate">{currentSong.artist_username || "Unknown Artist"}</p>
        </div>
        {onLikeCurrent && (
          <button onClick={() => onLikeCurrent(currentSong)} className="shrink-0">
            <FiHeart size={16} className={isFavorite ? "fill-brand-green text-brand-green" : "text-textmuted hover:text-white"} />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center gap-1 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={toggleShuffle} className={shuffle ? "text-brand-green" : "text-textmuted hover:text-white"}>
            <FiShuffle size={16} />
          </button>
          <button onClick={playPrevious} className="text-textmuted hover:text-white">
            <FiSkipBack size={18} />
          </button>
          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} className="ml-0.5" />}
          </button>
          <button onClick={playNext} className="text-textmuted hover:text-white">
            <FiSkipForward size={18} />
          </button>
          <button
            onClick={cycleRepeat}
            className={repeatMode !== "off" ? "text-brand-green relative" : "text-textmuted hover:text-white"}
          >
            <FiRepeat size={16} />
            {repeatMode === "one" && (
              <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 w-full">
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
      </div>

      {/* Volume + fullscreen */}
      <div className="w-1/4 flex items-center justify-end gap-3">
        <button onClick={() => setIsFullScreen(true)} className="text-textmuted hover:text-white">
          <FiMaximize2 size={16} />
        </button>
        <button onClick={() => changeVolume(volume > 0 ? 0 : 0.8)} className="text-textmuted hover:text-white">
          {volume > 0 ? <FiVolume2 size={16} /> : <FiVolumeX size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          className="w-24"
          style={{
            background: `linear-gradient(to right, #1DB954 ${volume * 100}%, #4d4d4d 0%)`,
          }}
        />
      </div>
    </div>
  );
}
