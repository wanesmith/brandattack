import { isLocale, LOCALES } from "@/lib/i18n/config";
import { EN_MESSAGES, MESSAGE_KEYS } from "@/lib/i18n/messages";
import { getMessages } from "@/lib/i18n/server";
import { TranslationsEditor } from "./TranslationsEditor";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ locale?: string }>;

export default async function TranslationsAdmin({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const locale = isLocale(sp.locale) ? sp.locale : "ms";

  // Effective current strings for this locale (built-in defaults + overrides).
  const current = await getMessages(locale);
  const rows = MESSAGE_KEYS.map((key) => ({
    key,
    source: EN_MESSAGES[key] ?? "",
    value: current[key] ?? "",
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold">Translations</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Edit the storefront UI text per language. Blank a field to revert it to the built-in
        default. English is the source/fallback.
      </p>
      <TranslationsEditor
        locale={locale}
        locales={LOCALES.map((l) => ({ code: l.code, native: l.native, label: l.label }))}
        rows={rows}
      />
    </div>
  );
}
