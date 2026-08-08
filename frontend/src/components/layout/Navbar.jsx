import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiSun, FiMoon, FiChevronDown, FiLogOut, FiUser, FiBell } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { SERVER_ROOT } from "../../services/api";

export default function Navbar({ darkMode, toggleDarkMode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-3 bg-surface-base/80 backdrop-blur-md border-b border-surface-border">
      <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-textmuted" size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, albums..."
          className="w-full bg-surface-card border border-surface-border rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder-textmuted focus:outline-none focus:ring-1 focus:ring-brand-green"
        />
      </form>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-surface-hover text-textmuted hover:text-white transition-colors"
          title="Toggle theme"
        >
          {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>

        <button
          className="p-2 rounded-full hover:bg-surface-hover text-textmuted hover:text-white transition-colors"
          title="Notifications"
        >
          <FiBell size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 bg-surface-card hover:bg-surface-hover rounded-full pl-1 pr-2 py-1 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-brand-green overflow-hidden flex items-center justify-center text-black text-xs font-bold">
              {user?.avatar_path ? (
                <img src={`${SERVER_ROOT}/uploads/${user.avatar_path}`} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase()
              )}
            </div>
            <span className="text-sm hidden sm:inline">{user?.username}</span>
            <FiChevronDown size={14} className="text-textmuted" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 glass rounded-md shadow-glass py-1 animate-fadeIn">
              <button
                onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-surface-hover"
              >
                <FiUser size={14} /> Profile
              </button>
              <button
                onClick={() => { setMenuOpen(false); logout(); navigate("/login"); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-surface-hover"
              >
                <FiLogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
