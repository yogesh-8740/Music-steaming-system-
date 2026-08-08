import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMusic } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setLoading(true);
    try {
      await login(form.username, form.password);
      showToast("Welcome back!", "success");
      navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail || "Login failed. Check your credentials.";
      setError(detail);
      if (err.response?.status === 403 && detail.toLowerCase().includes("verify")) {
        setNeedsVerification(true);
      }
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
          <h1 className="text-xl font-bold text-white">Welcome back to WaveNet</h1>
          <p className="text-sm text-textmuted mt-1">Log in to keep listening</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm rounded-md px-3 py-2 mb-4">
            {error}
            {needsVerification && (
              <Link
                to="/verify-email"
                className="block mt-2 text-brand-green hover:underline font-medium"
              >
                Go to verification page →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-textmuted mb-1 block">Username</label>
            <input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="text-xs text-textmuted mb-1 block">Password</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          </div>

          <div className="text-right -mt-2">
            <Link to="/forgot-password" className="text-xs text-textmuted hover:text-brand-green">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-center text-sm text-textmuted mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-white hover:text-brand-green font-medium">
            Sign up
          </Link>
        </p>

        <p className="text-center text-xs text-textmuted mt-4">
          Default admin: <span className="text-white">admin</span> / <span className="text-white">Admin@123</span>
        </p>
      </div>
    </div>
  );
}
