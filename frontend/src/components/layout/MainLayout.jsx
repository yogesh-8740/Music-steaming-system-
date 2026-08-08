import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import PlayerBar from "../player/PlayerBar";
import FullScreenPlayer from "../player/FullScreenPlayer";
import { usePlayer } from "../../context/PlayerContext";
import api from "../../services/api";

export default function MainLayout() {
  const [darkMode, setDarkMode] = useState(true);
  const { currentSong } = usePlayer();
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    api.get("/favorites").then(({ data }) => setFavoriteIds(new Set(data.map((s) => s.id)))).catch(() => {});
  }, [currentSong?.id]);

  const handleLikeCurrent = async (song) => {
    try {
      if (favoriteIds.has(song.id)) {
        await api.delete(`/favorites/${song.id}`);
        setFavoriteIds((prev) => { const n = new Set(prev); n.delete(song.id); return n; });
      } else {
        await api.post(`/favorites/${song.id}`);
        setFavoriteIds((prev) => new Set(prev).add(song.id));
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="flex min-h-screen bg-surface-base">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Navbar darkMode={darkMode} toggleDarkMode={() => setDarkMode((d) => !d)} />
        <main>
          <Outlet />
        </main>
      </div>
      <PlayerBar onLikeCurrent={handleLikeCurrent} isFavorite={currentSong ? favoriteIds.has(currentSong.id) : false} />
      <FullScreenPlayer onLikeCurrent={handleLikeCurrent} isFavorite={currentSong ? favoriteIds.has(currentSong.id) : false} />
    </div>
  );
}
