import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { FiMusic, FiPlay, FiHeart, FiDownload, FiTrash2 } from "react-icons/fi";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-surface-card rounded-lg p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-brand-green">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-textmuted">{label}</p>
      </div>
    </div>
  );
}

export default function ArtistDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [overview, setOverview] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ovRes, topRes, uploadsRes] = await Promise.all([
        api.get("/artist/stats/overview"),
        api.get("/artist/stats/top-songs"),
        api.get(`/songs/artist/${user.id}/uploads`),
      ]);
      setOverview(ovRes.data);
      setTopSongs(topRes.data);
      setUploads(uploadsRes.data);
    } catch {
      showToast("Failed to load artist stats", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (songId) => {
    if (!window.confirm("Delete this song permanently?")) return;
    try {
      await api.delete(`/songs/${songId}`);
      showToast("Song deleted", "success");
      load();
    } catch {
      showToast("Failed to delete song", "error");
    }
  };

  const chartData = {
    labels: topSongs.map((s) => s.title),
    datasets: [
      {
        label: "Plays",
        data: topSongs.map((s) => s.play_count),
        backgroundColor: "#1DB954",
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#a7a7a7" }, grid: { display: false } },
      y: { ticks: { color: "#a7a7a7" }, grid: { color: "#2a2a2a" } },
    },
  };

  if (loading) {
    return <div className="p-6 text-textmuted text-sm">Loading artist dashboard...</div>;
  }

  return (
    <div className="p-6 pb-28">
      <h1 className="text-2xl font-bold text-white mb-6">Artist Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FiMusic size={18} />} label="Total Songs" value={overview?.total_songs ?? 0} />
        <StatCard icon={<FiPlay size={18} />} label="Total Plays" value={overview?.total_plays ?? 0} />
        <StatCard icon={<FiHeart size={18} />} label="Total Likes" value={overview?.total_likes ?? 0} />
        <StatCard icon={<FiDownload size={18} />} label="Downloads" value={overview?.total_downloads ?? 0} />
      </div>

      {topSongs.length > 0 && (
        <div className="bg-surface-card rounded-lg p-4 mb-8">
          <h2 className="text-sm font-semibold text-white mb-4">Most Popular Songs</h2>
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}

      <h2 className="text-lg font-bold text-white mb-4">Your Uploads</h2>
      <div className="flex flex-col gap-2">
        {uploads.length === 0 ? (
          <p className="text-textmuted text-sm">You haven't uploaded any songs yet.</p>
        ) : (
          uploads.map((song) => (
            <div key={song.id} className="flex items-center justify-between bg-surface-card rounded-md px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{song.title}</p>
                <p className="text-xs text-textmuted">
                  {song.play_count} plays • {song.like_count} likes • {song.file_format.toUpperCase()}
                </p>
              </div>
              <button onClick={() => handleDelete(song.id)} className="text-textmuted hover:text-red-400 p-2">
                <FiTrash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
