"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Product = {
  id: string;
  title: string;
  description: string;
  brand: string;
  priceUsd: string;
  rrpUsd: string;
  active: boolean;
};
type Variant = { sku: string; sizeLabel: string; stock: number; reserved: number };

export function ProductEditForm({
  product,
  variants,
}: {
  product: Product;
  variants: Variant[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(product);
  const [stocks, setStocks] = useState<Record<string, number>>(
    Object.fromEntries(variants.map((v) => [v.sku, v.stock]))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          variants: variants.map((v) => ({ sku: v.sku, stock: stocks[v.sku] ?? 0 })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
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

  const off =
    Number(form.rrpUsd) > 0
      ? Math.round(((Number(form.rrpUsd) - Number(form.priceUsd)) / Number(form.rrpUsd)) * 100)
      : 0;

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">Details</h2>
        <div className="space-y-4">
          <label className="block">
            <span className={labelCls}>Title</span>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls + " resize-y"}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Brand</span>
            <input value={form.brand} onChange={(e) => set("brand", e.target.value)} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>Price (USD)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.priceUsd}
                onChange={(e) => set("priceUsd", e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>RRP (USD)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.rrpUsd}
                onChange={(e) => set("rrpUsd", e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <p className="text-xs text-[var(--muted)]">Discount: {off > 0 ? `−${off}%` : "—"}</p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">Active (visible on the storefront)</span>
          </label>
        </div>
      </section>

      <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">Stock by size</h2>
        {variants.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No sizes for this product.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {variants.map((v) => (
              <label key={v.sku} className="block">
                <span className={labelCls}>
                  {v.sizeLabel}
                  {v.reserved > 0 && (
                    <span className="ml-1 text-[10px] text-[var(--muted)]">({v.reserved} held)</span>
                  )}
                </span>
                <input
                  type="number"
                  min="0"
                  value={stocks[v.sku] ?? 0}
                  onChange={(e) =>
                    setStocks((s) => ({ ...s, [v.sku]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
                  }
                  className={inputCls}
                />
              </label>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-sm bg-[var(--accent)] px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {msg && <span className="text-xs text-emerald-400">{msg}</span>}
        {err && <span className="text-xs text-red-400">{err}</span>}
      </div>
    </div>
  );
}
