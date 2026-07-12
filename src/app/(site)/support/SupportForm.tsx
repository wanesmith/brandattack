"use client";
import { useState } from "react";

const inputClass =
  "mt-1 w-full rounded-sm border border-rule bg-paper px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none";

export function SupportForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", company: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? `Failed (HTTP ${res.status})`);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-sm border border-rule bg-paper-warm p-6">
        <p className="font-display text-2xl text-ink">Thanks — message sent.</p>
        <p className="mt-2 text-sm text-ink-soft">
          We&apos;ll reply to <strong>{form.email}</strong> as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label-mono-sm text-ink/60">Name</span>
          <input
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="label-mono-sm text-ink/60">Email *</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block">
        <span className="label-mono-sm text-ink/60">Subject</span>
        <input
          type="text"
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
          placeholder="Order #, sizing, shipping…"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="label-mono-sm text-ink/60">Message *</span>
        <textarea
          required
          rows={6}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          className={inputClass + " resize-y"}
        />
      </label>

      {/* Honeypot — hidden from users */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        value={form.company}
        onChange={(e) => set("company", e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      {error && <p className="rounded-sm bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !form.email || form.message.trim().length < 5}
        className="w-full rounded-sm bg-accent px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
