"use client";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type Field = {
  key: string;
  group: string;
  label: string;
  type: "text" | "textarea" | "email" | "secret" | "select" | "number" | "image";
  default: string;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  value: string;
  source?: "database" | "env" | "unset";
  masked?: string;
};

export function SettingsEditor({ fields }: { fields: Field[] }) {
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
                <FieldRow key={f.key} field={f} value={values[f.key] ?? ""} onChange={update} />
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
}: {
  field: Field;
  value: string;
  onChange: (key: string, value: string) => void;
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
