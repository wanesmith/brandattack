"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";

// Header search: the icon expands into an input that filters the shop by query.
export function SearchBox() {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  }

  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" strokeLinecap="round" />
    </svg>
  );

  return (
    <div ref={wrapRef} className="relative flex items-center">
      {open ? (
        <form onSubmit={submit} className="flex items-center">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            placeholder={t("header.search")}
            className="h-9 w-44 rounded-sm border border-rule bg-paper px-3 text-sm text-ink focus:border-accent focus:outline-none sm:w-56"
          />
          <button
            type="submit"
            aria-label={t("header.search")}
            className="flex h-9 w-9 items-center justify-center text-ink transition-colors hover:text-accent"
          >
            {icon}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("header.search")}
          className="hidden h-9 w-9 items-center justify-center text-ink transition-colors hover:text-accent sm:flex"
        >
          {icon}
        </button>
      )}
    </div>
  );
}
