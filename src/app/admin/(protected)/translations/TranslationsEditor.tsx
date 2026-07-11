"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = { key: string; source: string; value: string };
type LocaleOpt = { code: string; native: string; label: string };

export function TranslationsEditor({
  locale,
  locales,
  rows,
}: {
  locale: string;
  locales: LocaleOpt[];
  rows: Row[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.key, r.value]))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Group by top-level section (the part before the first dot).
  const groups = useMemo(() => {
    const g: Record<string, Row[]> = {};
    for (const r of rows) {
      const section = r.key.split(".")[0];
      (g[section] ??= []).push(r);
    }
    return g;
  }, [rows]);

  const isEnglish = locale === "en";

  function onLocaleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/admin/translations?locale=${e.target.value}`);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/translations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, values }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setMsg(`Saved. ${data.saved} overridden, ${data.reverted} using default.`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[var(--muted)]">Language</span>
          <select value={locale} onChange={onLocaleChange} className={inputCls + " w-auto"}>
            {locales.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native} ({l.label})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-sm bg-[var(--accent)] px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {msg && <span className="text-xs text-emerald-400">{msg}</span>}
        {err && <span className="text-xs text-red-400">{err}</span>}
        {isEnglish && (
          <span className="text-xs text-[var(--muted)]">
            You&apos;re editing the English source — changes override the built-in copy.
          </span>
        )}
      </div>

      <div className="mt-6 space-y-8">
        {Object.entries(groups).map(([section, sectionRows]) => (
          <section key={section}>
            <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              {section}
            </h2>
            <div className="space-y-3">
              {sectionRows.map((r) => (
                <div
                  key={r.key}
                  className="grid gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-[220px_1fr]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] text-[var(--muted)]">{r.key}</div>
                    {!isEnglish && (
                      <div className="mt-1 text-xs text-[var(--muted)]">{r.source}</div>
                    )}
                  </div>
                  <textarea
                    rows={1}
                    value={values[r.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))}
                    className={inputCls + " resize-y"}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
