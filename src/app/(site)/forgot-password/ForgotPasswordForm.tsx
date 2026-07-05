"use client";
import { useState } from "react";

const inputClass =
  "w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none";
const btnClass =
  "w-full rounded-sm bg-accent px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-paper transition-opacity hover:opacity-90 disabled:opacity-50";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-sm bg-accent/10 px-4 py-3 text-sm text-ink">
        If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
        Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="label-mono-sm text-ink/60">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      {error && (
        <p className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      <button type="submit" disabled={loading || !email} className={btnClass}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
