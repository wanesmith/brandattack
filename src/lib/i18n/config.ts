// Supported storefront languages — one per ship-to market, English default.
// Cookie-based: the chosen locale is stored in the `locale` cookie and read by
// server components; no locale in the URL.
export const LOCALES = [
  { code: "en", label: "English", native: "English" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "fil", label: "Filipino", native: "Filipino" },
  { code: "zh-Hant", label: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

const CODES = LOCALES.map((l) => l.code) as readonly string[];

export function isLocale(v: string | undefined | null): v is Locale {
  return typeof v === "string" && CODES.includes(v);
}
