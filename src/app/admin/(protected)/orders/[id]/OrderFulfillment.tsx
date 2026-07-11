"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderFulfillment({
  id,
  status,
  statuses,
  trackingNumber,
  notes,
  fulfilled,
}: {
  id: string;
  status: string;
  statuses: string[];
  trackingNumber: string;
  notes: string;
  fulfilled: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ status, trackingNumber, notes, fulfilled });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(overrides?: Partial<typeof form>) {
    const payload = { ...form, ...overrides };
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setForm(payload);
      setMsg("Saved.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";
  const labelCls = "block text-xs uppercase tracking-wider text-[var(--muted)]";

  return (
    <section className="mt-8 rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider">Fulfilment</h2>
        <button
          type="button"
          onClick={() => save({ fulfilled: !form.fulfilled, status: form.fulfilled ? form.status : "shipped" })}
          disabled={saving}
          className={
            "rounded-sm px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 " +
            (form.fulfilled
              ? "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)]"
              : "bg-emerald-500 text-black hover:opacity-90")
          }
        >
          {form.fulfilled ? "Mark unfulfilled" : "Mark fulfilled"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className={inputCls}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Tracking number</span>
          <input
            value={form.trackingNumber}
            onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))}
            className={inputCls}
            placeholder="e.g. SG1234567890"
          />
        </label>
      </div>
      <label className="mt-4 block">
        <span className={labelCls}>Internal notes</span>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className={inputCls + " resize-y"}
        />
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          className="rounded-sm bg-[var(--accent)] px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {msg && <span className="text-xs text-emerald-400">{msg}</span>}
        {err && <span className="text-xs text-red-400">{err}</span>}
      </div>
    </section>
  );
}
