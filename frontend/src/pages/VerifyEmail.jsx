import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiMail } from "react-icons/fi";
import api from "../services/api";
import { useToast } from "../context/ToastContext";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";
  const { showToast } = useToast();

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-email", { email, code });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      showToast("Email verified! Welcome to WaveNet.", "success");
      window.location.href = "/dashboard"; // full reload so AuthContext picks up the new session
    } catch (err) {
      setError(err.response?.data?.detail || "Verification failed. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email });
      showToast("A new code has been sent to your email.", "success");
    } catch {
      showToast("Failed to resend code", "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-8 animate-fadeIn">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-brand-green flex items-center justify-center mb-3">
            <FiMail className="text-black" size={22} />
          </div>
          <h1 className="text-xl font-bold text-white text-center">Verify your email</h1>
          <p className="text-sm text-textmuted mt-1 text-center">
            {emailFromQuery ? (
              <>We sent a 6-digit code to <span className="text-white">{email}</span>.</>
            ) : (
              "Enter your email and the 6-digit code we sent you."
            )}
            <br />
            <span className="text-xs">(No real inbox set up? Check the backend server console/terminal — the code is printed there.)</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-sm rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          {!emailFromQuery && (
            <input
              required
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
            />
          )}
          <input
            required
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full bg-surface-card border border-surface-border rounded-md px-3 py-3 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="bg-brand-green hover:bg-brand-greenDark text-black font-semibold rounded-full py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full text-center text-sm text-textmuted hover:text-brand-green mt-4 disabled:opacity-60"
        >
          {resending ? "Sending..." : "Didn't get a code? Resend"}
        </button>

        <p className="text-center text-sm text-textmuted mt-6">
          <Link to="/login" className="text-white hover:text-brand-green font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
