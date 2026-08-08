import React, { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend,
} from "chart.js";
import {
  FiUsers, FiMusic, FiPlay, FiServer, FiShield, FiTrash2, FiWifi, FiWifiOff,
} from "react-icons/fi";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const TABS = ["Overview", "Users", "Songs", "Storage Nodes", "Analytics"];

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-surface-card rounded-lg p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-brand-green shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-white truncate">{value}</p>
        <p className="text-xs text-textmuted">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [tab, setTab] = useState("Overview");
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [dailyStreams, setDailyStreams] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dashRes, usersRes, songsRes, nodesRes, dailyRes, artistsRes] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/users"),
        api.get("/admin/songs"),
        api.get("/admin/storage-nodes"),
        api.get("/analytics/streams-daily?days=7"),
        api.get("/analytics/top-artists?limit=5"),
      ]);
      setDashboard(dashRes.data);
      setUsers(usersRes.data);
      setSongs(songsRes.data);
      setNodes(nodesRes.data);
      setDailyStreams(dailyRes.data);
      setTopArtists(artistsRes.data);
    } catch {
      showToast("Failed to load admin data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleUser = async (id) => {
    try {
      await api.put(`/admin/users/${id}/toggle-active`);
      loadAll();
    } catch { showToast("Failed to update user", "error"); }
  };

  const handleToggleUpload = async (id) => {
    try {
      await api.put(`/admin/users/${id}/toggle-upload`);
      loadAll();
    } catch { showToast("Failed to update upload privilege", "error"); }
  };

  const handleDeleteSong = async (id) => {
    if (!window.confirm("Delete this song?")) return;
    try {
      await api.delete(`/admin/songs/${id}`);
      loadAll();
      showToast("Song deleted", "success");
    } catch { showToast("Failed to delete song", "error"); }
  };

  const handleToggleNode = async (id) => {
    try {
      await api.put(`/admin/storage-nodes/${id}/toggle-online`);
      loadAll();
    } catch { showToast("Failed to update node", "error"); }
  };

  const handleAlgorithmChange = async (algorithm) => {
    try {
      await api.put("/admin/load-balancing", { algorithm });
      showToast(`Load balancing set to ${algorithm}`, "success");
      loadAll();
    } catch { showToast("Failed to update algorithm", "error"); }
  };

  if (loading) return <div className="p-6 text-textmuted text-sm">Loading admin dashboard...</div>;

  return (
    <div className="p-6 pb-28">
      <div className="flex items-center gap-2 mb-6">
        <FiShield className="text-brand-green" size={22} />
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
      </div>

      <div className="flex gap-2 mb-8 border-b border-surface-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? "border-brand-green text-white" : "border-transparent text-textmuted hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && dashboard && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<FiUsers size={18} />} label="Total Listeners" value={dashboard.total_users} />
            <StatCard icon={<FiMusic size={18} />} label="Total Artists" value={dashboard.total_artists} />
            <StatCard icon={<FiPlay size={18} />} label="Total Plays" value={dashboard.total_plays} />
            <StatCard icon={<FiServer size={18} />} label="Nodes Online" value={`${dashboard.online_nodes}/${dashboard.total_nodes}`} />
          </div>
          <div className="bg-surface-card rounded-lg p-4">
            <h2 className="text-sm font-semibold text-white mb-2">Cache Performance</h2>
            <p className="text-xs text-textmuted mb-3">
              LRU Cache — {dashboard.cache_stats.cache_size}/{dashboard.cache_stats.max_size} songs cached
            </p>
            <div className="flex gap-6 text-sm">
              <span className="text-brand-green">Hit Ratio: {dashboard.cache_stats.hit_ratio}%</span>
              <span className="text-textmuted">Hits: {dashboard.cache_stats.hits}</span>
              <span className="text-textmuted">Misses: {dashboard.cache_stats.misses}</span>
            </div>
          </div>
        </>
      )}

      {tab === "Users" && (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between bg-surface-card rounded-md px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{u.username} <span className="text-xs text-textmuted">({u.role})</span></p>
                <p className="text-xs text-textmuted">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${u.is_verified ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {u.is_verified ? "Verified" : "Unverified"}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? "bg-brand-green/20 text-brand-green" : "bg-red-500/20 text-red-400"}`}>
                  {u.is_active ? "Active" : "Disabled"}
                </span>
                {u.role !== "admin" && (
                  <>
                    <button
                      onClick={() => handleToggleUpload(u.id)}
                      className={`text-xs border border-surface-border rounded-full px-3 py-1 ${
                        u.can_upload === false ? "text-red-400 hover:text-red-300" : "text-textmuted hover:text-white"
                      }`}
                      title="Toggle this user's ability to upload songs"
                    >
                      {u.can_upload === false ? "Uploads Off" : "Uploads On"}
                    </button>
                    <button
                      onClick={() => handleToggleUser(u.id)}
                      className="text-xs text-textmuted hover:text-white border border-surface-border rounded-full px-3 py-1"
                    >
                      {u.is_active ? "Disable" : "Enable"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Songs" && (
        <div className="flex flex-col gap-2">
          {songs.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-surface-card rounded-md px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{s.title}</p>
                <p className="text-xs text-textmuted">{s.play_count} plays • {s.like_count} likes • {s.file_format.toUpperCase()}</p>
              </div>
              <button onClick={() => handleDeleteSong(s.id)} className="text-textmuted hover:text-red-400 p-2 shrink-0">
                <FiTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "Storage Nodes" && (
        <>
          <div className="bg-surface-card rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-white mb-3">Load Balancing Algorithm</h2>
            <div className="flex gap-2 flex-wrap">
              {["round_robin", "least_used", "random"].map((algo) => (
                <button
                  key={algo}
                  onClick={() => handleAlgorithmChange(algo)}
                  className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                    dashboard?.current_load_balancing_algorithm === algo
                      ? "bg-brand-green text-black border-brand-green"
                      : "border-surface-border text-textmuted hover:text-white"
                  }`}
                >
                  {algo.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((n) => (
              <div key={n.id} className="bg-surface-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">{n.name}</span>
                  {n.is_online ? (
                    <FiWifi className="text-brand-green" size={16} />
                  ) : (
                    <FiWifiOff className="text-red-400" size={16} />
                  )}
                </div>
                <p className="text-xs text-textmuted mb-1">Files: {n.file_count}</p>
                <p className="text-xs text-textmuted mb-1">Used: {n.used_space_mb.toFixed(2)} MB</p>
                <p className="text-xs text-textmuted mb-3">Free: {n.free_space_mb.toFixed(2)} MB</p>
                <button
                  onClick={() => handleToggleNode(n.id)}
                  className="w-full text-xs border border-surface-border rounded-full px-3 py-1.5 text-textmuted hover:text-white"
                >
                  {n.is_online ? "Simulate Offline" : "Bring Online"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "Analytics" && (
        <div className="flex flex-col gap-8">
          <div className="bg-surface-card rounded-lg p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Daily Streams (Last 7 Days)</h2>
            <Line
              data={{
                labels: dailyStreams.map((d) => d.date),
                datasets: [{
                  label: "Streams",
                  data: dailyStreams.map((d) => d.streams),
                  borderColor: "#1DB954",
                  backgroundColor: "rgba(29,185,84,0.15)",
                  fill: true,
                  tension: 0.3,
                }],
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: "#a7a7a7" }, grid: { display: false } },
                  y: { ticks: { color: "#a7a7a7" }, grid: { color: "#2a2a2a" } },
                },
              }}
            />
          </div>

          <div className="bg-surface-card rounded-lg p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Top Artists by Plays</h2>
            <Bar
              data={{
                labels: topArtists.map((a) => a.artist),
                datasets: [{
                  label: "Total Plays",
                  data: topArtists.map((a) => a.total_plays),
                  backgroundColor: "#1DB954",
                  borderRadius: 4,
                }],
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: "#a7a7a7" }, grid: { display: false } },
                  y: { ticks: { color: "#a7a7a7" }, grid: { color: "#2a2a2a" } },
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
