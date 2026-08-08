import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMusic } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "", email: "", full_name: "", password: "", role: "user",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      showToast("Account created! Check your email for a verification code.", "success");
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-8 animate-fadeIn">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-brand-green flex items-center justify-center mb-3">
            <FiMusic className="text-black" size={22} />
          </div>
          <h1 className="text-xl font-bold text-white">Create your account</h1>
          <p className="text-sm text-textmuted mt-1">Join WaveNet and start streaming</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-textmuted mb-1 block">Username</label>
            <input
              required minLength={3}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="text-xs text-textmuted mb-1 block">Email</label>
            <input
              required type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="text-xs text-textmuted mb-1 block">Full Name</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="text-xs text-textmuted mb-1 block">Password</label>
            <input
              required minLength={6} type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="text-xs text-textmuted mb-1 block">I am a...</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
            >
              <option value="user">Listener</option>
              <option value="artist">Artist</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full py-2.5 text-sm transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-textmuted mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-white hover:text-brand-green font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
