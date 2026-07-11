"use client";
import Link from "next/link";
import { useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";

const inputClass =
  "w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none";
const btnClass =
  "w-full rounded-sm bg-accent px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-paper transition-opacity hover:opacity-90 disabled:opacity-50";

export function SignupForm({ next }: { next: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? `Sign up failed (HTTP ${res.status})`);
      }
      window.location.href = next || "/account";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="label-mono-sm text-ink/60">Name (optional)</span>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
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
      <label className="block">
        <span className="label-mono-sm text-ink/60">Password</span>
        <PasswordInput
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          containerClassName="mt-1"
          className={inputClass}
        />
        <span className="mt-1 block text-[11px] text-ink/50">At least 8 characters.</span>
      </label>
      {error && (
        <p className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      <button type="submit" disabled={loading || !email || password.length < 8} className={btnClass}>
        {loading ? "Creating account…" : "Create account"}
      </button>
      <p className="text-xs text-ink/60">
        Already have an account?{" "}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="hover:text-accent"
        >
          Sign in →
        </Link>
      </p>
    </form>
  );
}
