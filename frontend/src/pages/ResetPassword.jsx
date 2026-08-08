import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: newPassword });
      showToast("Password reset successfully. Please log in.", "success");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-8 animate-fadeIn">
        <h1 className="text-xl font-bold text-white mb-6">Set a new password</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            required minLength={6} type="password" placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <button
            type="submit" disabled={loading}
            className="bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="text-center text-sm text-textmuted mt-6">
          <Link to="/login" className="text-white hover:text-brand-green font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
