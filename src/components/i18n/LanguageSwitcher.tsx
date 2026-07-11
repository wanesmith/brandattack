"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_COOKIE } from "@/lib/i18n/config";
import { useT } from "./LocaleProvider";

export function LanguageSwitcher() {
  const { locale } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    // Non-httpOnly cookie so this client write is picked up by the next
    // server render triggered by router.refresh().
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <label className="relative inline-flex items-center" title="Language">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={onChange}
        disabled={pending}
        aria-label="Language"
        className="cursor-pointer rounded-sm border border-rule bg-transparent py-1.5 pl-2 pr-6 font-mono text-[11px] uppercase tracking-wider text-ink hover:border-accent focus:border-accent focus:outline-none disabled:opacity-50"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
