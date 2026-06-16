"use client";
import { useState } from "react";

type FacetValue = {
  value: string;
  label: string;
  visible: boolean;
  productCount: number;
};

type Facet = {
  id: string;
  label: string;
  visible: boolean;
  values: FacetValue[];
};

type State = {
  facets: Array<{
    id: string;
    label: string;
    position: number;
    visible: boolean;
    values: Array<{
      value: string;
      label: string;
      position: number;
      visible: boolean;
      productCount: number;
    }>;
  }>;
};

export function FiltersEditor({ initial }: { initial: Facet[] }) {
  // The server returns facets pre-sorted; positions are 10/20/30/... by default.
  // We assign positions in 10s for new edits so insert-between is easy.
  const [state, setState] = useState<State>({
    facets: initial.map((f, fi) => ({
      id: f.id,
      label: f.label,
      position: (fi + 1) * 10,
      visible: f.visible,
      values: f.values.map((v, vi) => ({
        value: v.value,
        label: v.label,
        position: (vi + 1) * 10,
        visible: v.visible,
        productCount: v.productCount,
      })),
    })),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateFacet(id: string, patch: Partial<State["facets"][number]>) {
    setSaved(false);
    setState((s) => ({
      ...s,
      facets: s.facets.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }

  function updateValue(
    facetId: string,
    value: string,
    patch: Partial<State["facets"][number]["values"][number]>
  ) {
    setSaved(false);
    setState((s) => ({
      ...s,
      facets: s.facets.map((f) =>
        f.id !== facetId
          ? f
          : {
              ...f,
              values: f.values.map((v) => (v.value === value ? { ...v, ...patch } : v)),
            }
      ),
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {
        facets: state.facets.map((f) => ({
          id: f.id,
          label: f.label,
          position: f.position,
          visible: f.visible,
        })),
        values: state.facets.flatMap((f) =>
          f.values.map((v) => ({
            facet: f.id,
            value: v.value,
            label: v.label,
            position: v.position,
            visible: v.visible,
          }))
        ),
      };
      const res = await fetch("/api/admin/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let body: { ok?: boolean; error?: string } | null = null;
      try {
        body = await res.json();
      } catch {
        /* non-JSON */
      }
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? `Save failed (HTTP ${res.status})`);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  // Sort for display by position
  const facets = [...state.facets].sort((a, b) => a.position - b.position);

  return (
    <div className="mt-6 space-y-5">
      <div className="space-y-4">
        {facets.map((f) => {
          const values = [...f.values].sort((a, b) => a.position - b.position);
          return (
            <details
              key={f.id}
              open={f.visible}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)]"
            >
              <summary className="flex cursor-pointer items-center gap-3 px-5 py-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
                  {f.id}
                </span>
                <span className="font-semibold">{f.label || f.id}</span>
                <span className="text-xs text-[var(--muted)]">
                  · {values.filter((v) => v.visible).length}/{values.length} visible
                </span>
                <span className="ml-auto flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={f.visible}
                      onChange={(e) => updateFacet(f.id, { visible: e.target.checked })}
                    />
                    <span className="text-xs">Show on sidebar</span>
                  </label>
                </span>
              </summary>

              <div className="border-t border-[var(--border)] px-5 py-4">
                <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-2 text-sm">
                  <label className="text-[var(--muted)]" htmlFor={`label-${f.id}`}>
                    Display label
                  </label>
                  <input
                    id={`label-${f.id}`}
                    type="text"
                    value={f.label}
                    onChange={(e) => updateFacet(f.id, { label: e.target.value })}
                    className="rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-none"
                  />
                  <label className="text-[var(--muted)]" htmlFor={`pos-${f.id}`}>
                    Position
                  </label>
                  <input
                    id={`pos-${f.id}`}
                    type="number"
                    value={f.position}
                    onChange={(e) =>
                      updateFacet(f.id, { position: Number(e.target.value) || 0 })
                    }
                    className="w-24 rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                <h3 className="mt-5 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Values
                </h3>
                <div className="mt-2 overflow-hidden rounded-sm border border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--background)] text-left font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      <tr>
                        <th className="px-3 py-2">Show</th>
                        <th className="px-3 py-2">Raw value</th>
                        <th className="px-3 py-2">Display label</th>
                        <th className="w-20 px-3 py-2">Position</th>
                        <th className="w-16 px-3 py-2 text-right">Items</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {values.map((v) => (
                        <tr key={v.value} className={v.visible ? "" : "opacity-50"}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={v.visible}
                              onChange={(e) =>
                                updateValue(f.id, v.value, { visible: e.target.checked })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{v.value}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={v.label}
                              onChange={(e) =>
                                updateValue(f.id, v.value, { label: e.target.value })
                              }
                              className="w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm focus:border-[var(--accent)] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={v.position}
                              onChange={(e) =>
                                updateValue(f.id, v.value, {
                                  position: Number(e.target.value) || 0,
                                })
                              }
                              className="w-16 rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm focus:border-[var(--accent)] focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-[var(--muted)]">
                            {v.productCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-8 -mb-8 border-t border-[var(--border)] bg-[var(--background)]/95 px-8 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span className="font-mono text-xs text-emerald-300">Saved · live on shop now</span>
          )}
          {error && <span className="text-xs text-red-300">{error}</span>}
        </div>
      </div>
    </div>
  );
}
