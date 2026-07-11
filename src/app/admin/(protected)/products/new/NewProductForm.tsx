"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Size = { size: string; stock: string };

export function NewProductForm({
  divisions,
  genders,
}: {
  divisions: string[];
  genders: string[];
}) {
  const router = useRouter();
  const [f, setF] = useState({
    articleNo: "",
    title: "",
    description: "",
    brand: "Adidas",
    division: divisions[0] ?? "",
    gender: genders[0] ?? "",
    season: "",
    sportsCode: "",
    productGroup: "",
    productType: "",
    priceUsd: "",
    rrpUsd: "",
    active: true,
  });
  const [sizes, setSizes] = useState<Size[]>([{ size: "", stock: "0" }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof f>(key: K, value: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }
  function setSize(i: number, key: keyof Size, value: string) {
    setSizes((s) => s.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/products/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...f,
          variants: sizes
            .filter((s) => s.size.trim())
            .map((s) => ({ size: s.size.trim(), stock: Number(s.stock) || 0 })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      router.push(`/admin/products/${data.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";
  const labelCls = "block text-xs uppercase tracking-wider text-[var(--muted)]";

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider">Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>Article no. *</span>
              <input value={f.articleNo} onChange={(e) => set("articleNo", e.target.value)} className={inputCls} placeholder="IF3402" />
            </label>
            <label className="block">
              <span className={labelCls}>Brand</span>
              <input value={f.brand} onChange={(e) => set("brand", e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>Title *</span>
            <input value={f.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Description</span>
            <textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} className={inputCls + " resize-y"} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>Division *</span>
              <select value={f.division} onChange={(e) => set("division", e.target.value)} className={inputCls}>
                {divisions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Gender *</span>
              <select value={f.gender} onChange={(e) => set("gender", e.target.value)} className={inputCls}>
                {genders.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="block">
              <span className={labelCls}>Season</span>
              <input value={f.season} onChange={(e) => set("season", e.target.value)} className={inputCls} placeholder="SS26" />
            </label>
            <label className="block">
              <span className={labelCls}>Sport code</span>
              <input value={f.sportsCode} onChange={(e) => set("sportsCode", e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Product group</span>
              <input value={f.productGroup} onChange={(e) => set("productGroup", e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Product type</span>
              <input value={f.productType} onChange={(e) => set("productType", e.target.value)} className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>Price (USD) *</span>
              <input type="number" step="0.01" min="0" value={f.priceUsd} onChange={(e) => set("priceUsd", e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>RRP (USD) *</span>
              <input type="number" step="0.01" min="0" value={f.rrpUsd} onChange={(e) => set("rrpUsd", e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4" />
            <span className="text-sm">Active (visible on the storefront)</span>
          </label>
        </div>
      </section>

      <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider">Sizes & stock</h2>
          <button
            type="button"
            onClick={() => setSizes((s) => [...s, { size: "", stock: "0" }])}
            className="font-mono text-xs uppercase tracking-wider text-[var(--accent)] hover:underline"
          >
            + Add size
          </button>
        </div>
        <div className="space-y-2">
          {sizes.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.size}
                onChange={(e) => setSize(i, "size", e.target.value)}
                placeholder="Size (e.g. M or 9)"
                className={inputCls + " mt-0 flex-1"}
              />
              <input
                type="number"
                min="0"
                value={row.stock}
                onChange={(e) => setSize(i, "stock", e.target.value)}
                placeholder="Stock"
                className={inputCls + " mt-0 w-28"}
              />
              <button
                type="button"
                onClick={() => setSizes((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : s))}
                className="px-2 text-[var(--muted)] hover:text-red-400"
                aria-label="Remove size"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          SKU is generated as &lt;article no&gt;-&lt;size&gt;. After creating, you can upload images on
          the product&apos;s edit page.
        </p>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-sm bg-[var(--accent)] px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create product"}
        </button>
        {err && <span className="text-xs text-red-400">{err}</span>}
      </div>
    </div>
  );
}
