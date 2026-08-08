import React from "react";
import { NavLink } from "react-router-dom";
import { FiHome, FiSearch, FiHeart, FiClock, FiPlusSquare, FiUpload, FiBarChart2, FiShield, FiMusic, FiActivity } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive ? "bg-surface-hover text-white" : "text-textmuted hover:text-white hover:bg-surface-hover"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-surface-raised border-r border-surface-border p-4 gap-6">
      <div className="flex items-center gap-2 px-2">
        <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center">
          <FiMusic className="text-black" size={16} />
        </div>
        <span className="text-lg font-bold tracking-tight">WaveNet</span>
      </div>

      <nav className="flex flex-col gap-1">
        <NavItem to="/dashboard" icon={<FiHome size={18} />} label="Home" />
        <NavItem to="/search" icon={<FiSearch size={18} />} label="Search" />
      </nav>

      <div className="h-px bg-surface-border" />

      <nav className="flex flex-col gap-1">
        <NavItem to="/library/favorites" icon={<FiHeart size={18} />} label="Liked Songs" />
        <NavItem to="/library/history" icon={<FiClock size={18} />} label="Recently Played" />
        <NavItem to="/library/playlists" icon={<FiPlusSquare size={18} />} label="Playlists" />
      </nav>

      <div className="h-px bg-surface-border" />
      <nav className="flex flex-col gap-1">
        <NavItem to="/upload" icon={<FiUpload size={18} />} label="Upload Music" />
        <NavItem to="/library/my-uploads" icon={<FiMusic size={18} />} label="My Uploads" />
      </nav>

      <div className="h-px bg-surface-border" />
      <nav className="flex flex-col gap-1">
        <NavItem to="/network" icon={<FiActivity size={18} />} label="Network Map" />
      </nav>

      {(user?.role === "artist" || user?.role === "admin") && (
        <>
          <div className="h-px bg-surface-border" />
          <nav className="flex flex-col gap-1">
            <NavItem to="/artist/dashboard" icon={<FiBarChart2 size={18} />} label="Artist Stats" />
          </nav>
        </>
      )}

      {user?.role === "admin" && (
        <>
          <div className="h-px bg-surface-border" />
          <nav className="flex flex-col gap-1">
            <NavItem to="/admin/dashboard" icon={<FiShield size={18} />} label="Admin Panel" />
          </nav>
        </>
      )}

      <div className="mt-auto text-xs text-textmuted px-2">
        Decentralized Music Streaming • Localhost
      </div>
    </aside>
  );
}
