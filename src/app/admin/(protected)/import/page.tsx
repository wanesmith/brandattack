import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Import a stock lot</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
        Upload the spreadsheet for the lot plus a zip of product photos. We&apos;ll parse the sheet,
        resize photos to WebP, and upsert products and inventory in Postgres. Re-running with the
        same article numbers updates instead of duplicating.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <ImportForm />
        <aside className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Expected formats
          </h2>
          <dl className="mt-3 space-y-3">
            <div>
              <dt className="font-semibold">Spreadsheet (xlsx)</dt>
              <dd className="mt-1 text-[var(--muted)]">
                Three sheets: <code className="text-foreground">Asset Report</code>,{" "}
                <code className="text-foreground">VerticaL Article Size Qty</code>,{" "}
                <code className="text-foreground">Pictures List</code>. Header row on row 2 of
                the asset sheet. Required columns: ArticleNo, Item Description, Season, Division,
                Gender, Sports Code, Product Group, Product Type, Total Quantity, Price, RRP Price
                (USD).
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Image zip</dt>
              <dd className="mt-1 text-[var(--muted)]">
                Filenames <code className="text-foreground">&lt;ArticleNo&gt;-N.jpg</code> (1..6).
                Folder nesting fine. Originals up to ~5 MB each. We resize to 1200 px WebP at
                quality 82.
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
