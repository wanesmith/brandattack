"use client";
import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type Field = {
  key: string;
  group: string;
  label: string;
  type: "text" | "textarea" | "email" | "secret" | "select" | "number" | "image" | "images";
  default: string;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  value: string;
  source?: "database" | "env" | "unset";
  masked?: string;
};

export function SettingsEditor({
  fields,
  heroAutoImages = [],
}: {
  fields: Field[];
  heroAutoImages?: string[];
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, f.value]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: string, value: string) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
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

  // Preserve the field order per group.
  const groups: string[] = [];
  for (const f of fields) if (!groups.includes(f.group)) groups.push(f.group);

  return (
    <div className="mt-6 space-y-6">
      {groups.map((group) => (
        <section
          key={group}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)]"
        >
          <h2 className="border-b border-[var(--border)] px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {group}
          </h2>
          <div className="space-y-5 px-5 py-5">
            {fields
              .filter((f) => f.group === group)
              .map((f) => (
                <FieldRow
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  onChange={update}
                  heroAutoImages={heroAutoImages}
                />
              ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 -mx-8 -mb-8 border-t border-[var(--border)] bg-[var(--background)]/95 px-8 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && <span className="font-mono text-xs text-emerald-300">Saved</span>}
          {error && <span className="text-xs text-red-300">{error}</span>}
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  field: f,
  value,
  onChange,
  heroAutoImages = [],
}: {
  field: Field;
  value: string;
  onChange: (key: string, value: string) => void;
  heroAutoImages?: string[];
}) {
  const inputClass =
    "w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";

  return (
    <div className="grid gap-1.5 sm:grid-cols-[220px_1fr] sm:gap-4">
      <label htmlFor={`f-${f.key}`} className="pt-2 text-sm font-medium">
        {f.label}
        {f.type === "secret" && <SecretBadge field={f} />}
      </label>
      <div>
        {f.type === "image" ? (
          <ImageField value={value} placeholder={f.placeholder} onChange={(v) => onChange(f.key, v)} />
        ) : f.type === "images" ? (
          <MultiImageField
            value={value}
            autoImages={heroAutoImages}
            onChange={(v) => onChange(f.key, v)}
          />
        ) : f.type === "textarea" ? (
          <textarea
            id={`f-${f.key}`}
            rows={f.key === "announcements" ? 6 : 3}
            value={value}
            placeholder={f.placeholder}
            onChange={(e) => onChange(f.key, e.target.value)}
            className={inputClass}
          />
        ) : f.type === "select" ? (
          <select
            id={`f-${f.key}`}
            value={value}
            onChange={(e) => onChange(f.key, e.target.value)}
            className={inputClass}
          >
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : f.type === "number" ? (
          <input
            id={`f-${f.key}`}
            type="number"
            value={value}
            placeholder={f.placeholder}
            onChange={(e) => onChange(f.key, e.target.value)}
            className={inputClass}
          />
        ) : (
          <input
            id={`f-${f.key}`}
            type={f.type === "secret" ? "password" : f.type === "email" ? "email" : "text"}
            autoComplete={f.type === "secret" ? "new-password" : "off"}
            value={value}
            placeholder={
              f.type === "secret" && f.source === "database"
                ? `Set (${f.masked}) — leave blank to keep`
                : f.type === "secret" && f.source === "env"
                  ? "Set via environment — enter a value to override"
                  : f.placeholder
            }
            onChange={(e) => onChange(f.key, e.target.value)}
            className={inputClass}
          />
        )}
        {f.help && <p className="mt-1 text-xs text-[var(--muted)]">{f.help}</p>}
      </div>
    </div>
  );
}

function ImageField({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputClass =
    "w-full rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await upload(`hero/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
      });
      onChange(blob.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed — is the Blob store connected?"
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-sm border border-[var(--border)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:border-[var(--accent)] disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Hero preview"
          className="mt-3 h-28 w-full max-w-sm rounded-sm border border-[var(--border)] object-cover"
        />
      )}
    </div>
  );
}

// Multi-image manager: value is a JSON array of URLs. Upload one or more,
// reorder with ←/→, remove with ✕.
function MultiImageField({
  value,
  onChange,
  autoImages = [],
}: {
  value: string;
  onChange: (v: string) => void;
  autoImages?: string[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ url: string; title: string }[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  let images: string[] = [];
  try {
    const arr = JSON.parse(value || "[]");
    if (Array.isArray(arr)) images = arr.filter((u) => typeof u === "string");
  } catch {
    if (value.trim()) images = [value.trim()];
  }

  const commit = (next: string[]) => onChange(JSON.stringify(next));

  // Load catalogue images (debounced) while the picker is open.
  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    setLoadingResults(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/images?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setResults(Array.isArray(d.images) ? d.images : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingResults(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pickerOpen, query]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const blob = await upload(`hero/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/admin/upload",
        });
        urls.push(blob.url);
      }
      commit([...images, ...urls].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — is the Blob store connected?");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded-sm border border-[var(--border)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:border-[var(--accent)] disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="rounded-sm border border-[var(--border)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:border-[var(--accent)]"
        >
          {pickerOpen ? "Close picker" : "Choose from catalogue"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
      </div>

      {pickerOpen && (
        <div className="mt-3 rounded-sm border border-[var(--border)] bg-[var(--background)] p-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products by name or article no…"
            className="w-full rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
          {loadingResults ? (
            <p className="mt-2 text-xs text-[var(--muted)]">Loading…</p>
          ) : results.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--muted)]">No matching product images.</p>
          ) : (
            <div className="mt-2 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {results.map((r) => {
                const added = images.includes(r.url);
                return (
                  <button
                    key={r.url}
                    type="button"
                    title={r.title}
                    onClick={() => !added && commit([...images, r.url].slice(0, 10))}
                    className={`relative aspect-video overflow-hidden rounded-sm border ${
                      added
                        ? "border-[var(--accent)]"
                        : "border-[var(--border)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.url} alt="" className="h-full w-full object-cover" />
                    {added && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-bold uppercase text-white">
                        Added ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      {images.length === 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-xs text-[var(--muted)]">
            No custom hero images set. The carousel is currently auto-showing these{" "}
            {autoImages.length} image{autoImages.length === 1 ? "" : "s"} from your catalogue.
            Upload above to override, or start from these:
          </p>
          {autoImages.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-2 opacity-80 sm:grid-cols-3">
                {autoImages.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-video overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--background)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => commit(autoImages)}
                className="mt-2 font-mono text-xs uppercase tracking-wider text-[var(--accent)] hover:underline"
              >
                Customise these →
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-video overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--background)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-sm bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-black">
                  First
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-white disabled:opacity-30" aria-label="Move earlier">←</button>
                <button type="button" onClick={() => commit(images.filter((_, idx) => idx !== i))} className="px-1 text-white hover:text-red-400" aria-label="Remove">✕</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="px-1 text-white disabled:opacity-30" aria-label="Move later">→</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecretBadge({ field: f }: { field: Field }) {
  const tone =
    f.source === "database"
      ? "bg-emerald-500/15 text-emerald-300"
      : f.source === "env"
        ? "bg-blue-500/15 text-blue-300"
        : "bg-zinc-500/15 text-zinc-400";
  const text =
    f.source === "database" ? "Configured" : f.source === "env" ? "From env" : "Not set";
  return (
    <span
      className={`ml-2 inline-block rounded-sm px-2 py-0.5 align-middle font-mono text-[10px] uppercase tracking-wider ${tone}`}
    >
      {text}
    </span>
  );
}
