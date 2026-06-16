"use client";
import { useState } from "react";

type Summary = {
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  imagesAdded: number;
  imagesMissing: string[];
  skippedRows: { articleNo: string; reason: string }[];
  durationMs: number;
};

export function ImportForm() {
  const [xlsx, setXlsx] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [replaceStock, setReplaceStock] = useState(false);
  const [markup, setMarkup] = useState("2");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!xlsx) {
      setError("Pick a spreadsheet first");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSummary(null);

    try {
      const form = new FormData();
      form.set("xlsx", xlsx);
      if (zip) form.set("zip", zip);
      form.set("replaceStock", replaceStock ? "true" : "false");
      form.set("markupOverCost", markup);

      const res = await fetch("/api/admin/import", { method: "POST", body: form });
      let data: { ok?: boolean; summary?: Summary; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        /* server returned non-JSON */
      }
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `Import failed (HTTP ${res.status})`);
      }
      setSummary(data.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-md border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <FileField
        label="Spreadsheet (.xlsx)"
        hint="The Asset Report + Vertical Size + Pictures List workbook."
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        file={xlsx}
        onChange={setXlsx}
        required
      />

      <FileField
        label="Image zip (.zip) — optional"
        hint="Skip to import metadata only. Filenames like JP9933-1.jpg."
        accept=".zip,application/zip,application/x-zip-compressed"
        file={zip}
        onChange={setZip}
      />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={replaceStock}
            onChange={(e) => setReplaceStock(e.target.checked)}
          />
          <span>
            <span className="block font-medium">Replace existing stock</span>
            <span className="block text-xs text-[var(--muted)]">
              Off (default) preserves on-hand quantities for variants that already exist; only new
              variants take stock from the sheet. Turn on for a fresh count from this lot.
            </span>
          </span>
        </label>

        <label className="block text-sm">
          <span className="block font-medium">Markup over wholesale cost</span>
          <input
            type="number"
            min="1"
            step="0.1"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            className="mt-1 w-24 rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Retail price = wholesale × markup, capped at 70% of RRP.
          </span>
        </label>
      </fieldset>

      {error && (
        <div className="rounded-sm bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !xlsx}
          className="rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Importing…" : "Import lot"}
        </button>
        {submitting && (
          <span className="text-xs text-[var(--muted)]">
            Image processing can take a while. Don&apos;t close the tab.
          </span>
        )}
      </div>

      {summary && <Summary summary={summary} />}
    </form>
  );
}

function FileField({
  label,
  hint,
  accept,
  file,
  onChange,
  required,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <input
        type="file"
        accept={accept}
        required={required}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="mt-1 block w-full text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:font-mono file:text-xs file:font-bold file:uppercase file:tracking-wider file:text-black hover:file:opacity-90"
      />
      <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>
      {file && (
        <span className="mt-1 block font-mono text-[11px] text-[var(--muted)]">
          {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
        </span>
      )}
    </label>
  );
}

function Summary({ summary }: { summary: Summary }) {
  return (
    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-5">
      <div className="font-mono text-xs uppercase tracking-wider text-emerald-300">
        Import complete · {(summary.durationMs / 1000).toFixed(1)}s
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <Row label="Products created" value={summary.productsCreated} />
        <Row label="Products updated" value={summary.productsUpdated} />
        <Row label="Variants created" value={summary.variantsCreated} />
        <Row label="Variants updated" value={summary.variantsUpdated} />
        <Row label="Images written" value={summary.imagesAdded} />
        <Row label="Skipped rows" value={summary.skippedRows.length} />
      </dl>

      {summary.imagesMissing.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-yellow-300">
            {summary.imagesMissing.length} product(s) with no images
          </summary>
          <ul className="mt-2 max-h-40 overflow-y-auto font-mono text-xs text-[var(--muted)]">
            {summary.imagesMissing.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </details>
      )}

      {summary.skippedRows.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-yellow-300">
            {summary.skippedRows.length} row(s) skipped
          </summary>
          <ul className="mt-2 max-h-40 overflow-y-auto text-xs">
            {summary.skippedRows.map((s, i) => (
              <li key={i} className="text-[var(--muted)]">
                <code className="text-foreground">{s.articleNo}</code> — {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </>
  );
}
