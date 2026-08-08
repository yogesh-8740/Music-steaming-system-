import React, { useEffect, useRef, useState, useCallback } from "react";
import { FiWifi, FiWifiOff, FiUsers, FiZap, FiDatabase, FiActivity } from "react-icons/fi";
import api, { SERVER_ROOT } from "../services/api";
import { useToast } from "../context/ToastContext";

const NODE_COLOR_ONLINE = "#1DB954";
const NODE_COLOR_OFFLINE = "#ef4444";
const HUB_RADIUS = 46;
const NODE_RADIUS = 40;

// 5 nodes arranged evenly around the hub in a circle
function nodePosition(index, total, cx, cy, radius) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

export default function NetworkMap() {
  const { showToast } = useToast();
  const [nodes, setNodes] = useState([]);
  const [algorithm, setAlgorithm] = useState("round_robin");
  const [liveListeners, setLiveListeners] = useState(0);
  const [cache, setCache] = useState(null);
  const [pulses, setPulses] = useState([]); // active "routing" animations
  const [recentActivity, setRecentActivity] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  const loadStatus = useCallback(() => {
    api.get("/network/status")
      .then(({ data }) => {
        setNodes(data.nodes);
        setAlgorithm(data.algorithm);
        setLiveListeners(data.live_listeners);
        setCache(data.cache);
      })
      .catch(() => showToast("Failed to load network status", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStatus();
    const poll = setInterval(loadStatus, 8000); // baseline sync every 8s

    // Live channel: reacts instantly to streams + node status flips,
    // without waiting for the next poll.
    const wsUrl = SERVER_ROOT.replace("http", "ws") + "/api/v1/ws/live";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "listener_count") {
          setLiveListeners(msg.count);
        } else if (msg.type === "node_activity") {
          const pulseId = Date.now() + Math.random();
          setPulses((prev) => [...prev, { id: pulseId, node: msg.node }]);
          setRecentActivity((prev) => [
            { id: pulseId, node: msg.node, title: msg.song_title, cached: msg.served_from_cache, ts: new Date() },
            ...prev.slice(0, 7),
          ]);
          setTimeout(() => {
            setPulses((prev) => prev.filter((p) => p.id !== pulseId));
          }, 1400);
        } else if (msg.type === "node_status_change") {
          loadStatus();
          showToast(`${msg.node} is now ${msg.status}`, msg.status === "online" ? "success" : "warning");
        }
      } catch (e) { /* ignore malformed frames */ }
    };

    return () => {
      clearInterval(poll);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStatus]);

  const width = 640;
  const height = 440;
  const cx = width / 2;
  const cy = height / 2;
  const orbitRadius = 160;

  return (
    <div className="p-6 pb-28">
      <div className="flex items-center gap-2 mb-1">
        <FiActivity className="text-brand-green" size={22} />
        <h1 className="text-2xl font-bold text-white">Network Map</h1>
        <span className={`ml-2 flex items-center gap-1 text-xs px-2 py-1 rounded-full ${wsConnected ? "bg-brand-green/20 text-brand-green" : "bg-red-500/20 text-red-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-brand-green animate-pulse" : "bg-red-400"}`} />
          {wsConnected ? "Live" : "Reconnecting..."}
        </span>
      </div>
      <p className="text-textmuted text-sm mb-6">
        Watch the platform's decentralized storage layer in real time — no blockchain, just 5 local
        nodes and a load balancer. Play any song in another tab and watch the pulse travel here.
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* SVG network diagram */}
        <div className="lg:col-span-2 bg-surface-card rounded-lg p-4 flex items-center justify-center overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: 640 }}>
            {/* connecting lines */}
            {nodes.map((node, i) => {
              const pos = nodePosition(i, nodes.length || 5, cx, cy, orbitRadius);
              return (
                <line
                  key={`line-${node.id}`}
                  x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                  stroke={node.is_online ? "#2a2a2a" : "#3a1a1a"}
                  strokeWidth={2}
                />
              );
            })}

            {/* animated pulses traveling from hub to active node */}
            {pulses.map((pulse) => {
              const idx = nodes.findIndex((n) => n.name === pulse.node);
              if (idx === -1) return null;
              const pos = nodePosition(idx, nodes.length, cx, cy, orbitRadius);
              return (
                <circle key={pulse.id} r={6} fill="#1DB954">
                  <animate
                    attributeName="cx" from={cx} to={pos.x} dur="1.1s" begin="0s" fill="freeze"
                  />
                  <animate
                    attributeName="cy" from={cy} to={pos.y} dur="1.1s" begin="0s" fill="freeze"
                  />
                  <animate attributeName="opacity" values="1;1;0" dur="1.3s" fill="freeze" />
                </circle>
              );
            })}

            {/* hub */}
            <circle cx={cx} cy={cy} r={HUB_RADIUS} fill="#181818" stroke="#1DB954" strokeWidth={2} />
            <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">Load</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">Balancer</text>

            {/* nodes */}
            {nodes.map((node, i) => {
              const pos = nodePosition(i, nodes.length, cx, cy, orbitRadius);
              const color = node.is_online ? NODE_COLOR_ONLINE : NODE_COLOR_OFFLINE;
              const isPulsing = pulses.some((p) => p.node === node.name);
              return (
                <g key={node.id}>
                  {isPulsing && (
                    <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS + 8} fill="none" stroke={color} strokeWidth={2} opacity={0.6}>
                      <animate attributeName="r" values={`${NODE_RADIUS};${NODE_RADIUS + 16}`} dur="0.9s" repeatCount="1" />
                      <animate attributeName="opacity" values="0.6;0" dur="0.9s" repeatCount="1" />
                    </circle>
                  )}
                  <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS} fill="#181818" stroke={color} strokeWidth={2.5} />
                  <text x={pos.x} y={pos.y - 6} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
                    {node.name.replace("storage_", "")}
                  </text>
                  <text x={pos.x} y={pos.y + 9} textAnchor="middle" fill={color} fontSize="9">
                    {node.is_online ? "ONLINE" : "OFFLINE"}
                  </text>
                  <text x={pos.x} y={pos.y + 22} textAnchor="middle" fill="#a7a7a7" fontSize="8">
                    {node.file_count} files
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side panel: stats + activity feed */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-card rounded-lg p-4">
            <h2 className="text-sm font-semibold text-white mb-3">Live Stats</h2>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-textmuted flex items-center gap-2"><FiUsers size={14} /> Listeners online</span>
                <span className="text-white font-semibold">{liveListeners}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textmuted flex items-center gap-2"><FiZap size={14} /> Algorithm</span>
                <span className="text-brand-green font-medium">{algorithm.replace("_", " ")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textmuted flex items-center gap-2"><FiDatabase size={14} /> Cache hit ratio</span>
                <span className="text-white font-semibold">{cache?.hit_ratio ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-textmuted">Nodes online</span>
                <span className="text-white font-semibold">
                  {nodes.filter((n) => n.is_online).length}/{nodes.length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-card rounded-lg p-4 flex-1">
            <h2 className="text-sm font-semibold text-white mb-3">Live Activity</h2>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-textmuted">
                Nothing yet — play a song (in this tab or another) and watch it appear here instantly.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentActivity.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs bg-surface-hover rounded px-2 py-1.5 animate-fadeIn">
                    <div className="min-w-0">
                      <p className="text-white truncate">{a.title}</p>
                      <p className="text-textmuted">
                        {a.node.replace("storage_", "")} {a.cached && "• cached"}
                      </p>
                    </div>
                    <FiWifi size={12} className="text-brand-green shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        {nodes.map((n) => (
          <div key={n.id} className="bg-surface-card rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">{n.name}</span>
              {n.is_online ? <FiWifi className="text-brand-green" size={14} /> : <FiWifiOff className="text-red-400" size={14} />}
            </div>
            <div className="w-full bg-surface-hover rounded-full h-1.5 mb-2 overflow-hidden">
              <div className="bg-brand-green h-full transition-all" style={{ width: `${Math.min(100, n.load_percent)}%` }} />
            </div>
            <p className="text-xs text-textmuted">{n.used_space_mb.toFixed(1)} MB used</p>
          </div>
        ))}
      </div>
    </div>
  );
}
