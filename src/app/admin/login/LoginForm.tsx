"use client";
import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/admin";
      } else {
        let body: { error?: string } | null = null;
        try {
          body = await res.json();
        } catch {
          /* server returned non-JSON */
        }
        setError(body?.error ?? `Login failed (HTTP ${res.status})`);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
          Password
        </span>
        <PasswordInput
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          containerClassName="mt-1"
          className="block w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
      </label>
      {error && (
        <p className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
