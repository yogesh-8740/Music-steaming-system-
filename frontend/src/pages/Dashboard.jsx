import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import SongCard from "../components/common/SongCard";
import { SongCardSkeletonGrid } from "../components/common/Skeletons";

export default function Dashboard() {
  const { user } = useAuth();
  const { playQueue } = usePlayer();
  const { showToast } = useToast();

  const [newest, setNewest] = useState([]);
  const [popular, setPopular] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [newestRes, popularRes, recRes, favRes] = await Promise.all([
          api.get("/songs?sort_by=newest&limit=10"),
          api.get("/songs?sort_by=popularity&limit=10"),
          api.get("/recommendations?limit=10").catch(() => ({ data: [] })),
          api.get("/favorites").catch(() => ({ data: [] })),
        ]);
        setNewest(newestRes.data);
        setPopular(popularRes.data);
        setRecommended(recRes.data);
        setFavoriteIds(new Set(favRes.data.map((s) => s.id)));
      } catch (err) {
        showToast("Failed to load songs", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = (song, list) => {
    const idx = list.findIndex((s) => s.id === song.id);
    playQueue(list, idx >= 0 ? idx : 0);
  };

  const handleLike = async (song) => {
    try {
      if (favoriteIds.has(song.id)) {
        await api.delete(`/favorites/${song.id}`);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(song.id);
          return next;
        });
      } else {
        await api.post(`/favorites/${song.id}`);
        setFavoriteIds((prev) => new Set(prev).add(song.id));
      }
    } catch {
      showToast("Failed to update favorite", "error");
    }
  };

  const Section = ({ title, songs }) => (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      {songs.length === 0 ? (
        <p className="text-sm text-textmuted">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onPlay={(s) => handlePlay(s, songs)}
              onLike={handleLike}
              isFavorite={favoriteIds.has(song.id)}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="p-6 pb-28">
      <h1 className="text-2xl font-bold text-white mb-1">
        {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"}, {user?.full_name || user?.username}
      </h1>
      <p className="text-textmuted mb-8">Here's what's playing on the network right now.</p>

      {loading ? (
        <>
          <SongCardSkeletonGrid />
          <div className="mt-10">
            <SongCardSkeletonGrid />
          </div>
        </>
      ) : (
        <>
          {recommended.length > 0 && <Section title="Recommended For You" songs={recommended} />}
          <Section title="New Releases" songs={newest} />
          <Section title="Popular Right Now" songs={popular} />
        </>
      )}
    </div>
  );
}
