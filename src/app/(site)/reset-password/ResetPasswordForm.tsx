"use client";
import Link from "next/link";
import { useState } from "react";

const inputClass =
  "w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none";
const btnClass =
  "w-full rounded-sm bg-accent px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-paper transition-opacity hover:opacity-90 disabled:opacity-50";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? `Reset failed (HTTP ${res.status})`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="rounded-sm bg-red-500/10 px-4 py-3 text-sm text-red-600">
        Missing reset token. Please use the link from your email, or{" "}
        <Link href="/forgot-password" className="underline">
          request a new one
        </Link>
        .
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded-sm bg-emerald-500/10 px-4 py-3 text-sm text-ink">
          Your password has been reset.
        </p>
        <Link href="/login" className={btnClass + " block text-center"}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="label-mono-sm text-ink/60">New password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="block">
        <span className="label-mono-sm text-ink/60">Confirm password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      {error && (
        <p className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      <button type="submit" disabled={loading || password.length < 8} className={btnClass}>
        {loading ? "Saving…" : "Reset password"}
      </button>
    </form>
  );
}
