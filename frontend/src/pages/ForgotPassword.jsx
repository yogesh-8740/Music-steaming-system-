import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-8 animate-fadeIn">
        <h1 className="text-xl font-bold text-white mb-2">Reset your password</h1>
        <p className="text-sm text-textmuted mb-6">
          Enter your email and we'll send a reset link (simulated — check the backend console log).
        </p>

        {sent ? (
          <div className="bg-brand-green/10 border border-brand-green/40 text-brand-green text-sm rounded-md px-3 py-3">
            If that email is registered, a reset link has been generated. Check the backend server console output for the simulated link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              required type="email" placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
            <button
              type="submit" disabled={loading}
              className="bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full py-2.5 text-sm transition-colors disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-textmuted mt-6">
          <Link to="/login" className="text-white hover:text-brand-green font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
