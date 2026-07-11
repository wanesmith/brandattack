// Turns the nested dictionaries into flat dot-keyed maps ("nav.men" → "Men").
// Flat keys make DB overrides and the admin editor straightforward.
import type { Locale } from "./config";
import { en } from "./dictionaries/en";
import { ms } from "./dictionaries/ms";
import { th } from "./dictionaries/th";
import { id } from "./dictionaries/id";
import { vi } from "./dictionaries/vi";
import { fil } from "./dictionaries/fil";
import { zhHant } from "./dictionaries/zh-Hant";
import { ja } from "./dictionaries/ja";
import { ko } from "./dictionaries/ko";

export type Messages = Record<string, string>;

export function flatten(obj: Record<string, unknown>, prefix = ""): Messages {
  const out: Messages = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

const RAW: Record<Locale, Record<string, unknown>> = {
  en,
  ms,
  th,
  id,
  vi,
  fil,
  "zh-Hant": zhHant,
  ja,
  ko,
};

// Built-in default translations, flattened. DB overrides layer on top of these.
export const DEFAULTS: Record<Locale, Messages> = Object.fromEntries(
  Object.entries(RAW).map(([loc, dict]) => [loc, flatten(dict)])
) as Record<Locale, Messages>;

// Canonical key list + English source strings, used by the admin editor.
export const EN_MESSAGES: Messages = DEFAULTS.en;
export const MESSAGE_KEYS: string[] = Object.keys(DEFAULTS.en);

/** English-backed defaults for a locale (English fills any gap). */
export function defaultsFor(locale: Locale): Messages {
  return { ...DEFAULTS.en, ...(DEFAULTS[locale] ?? {}) };
}

/** Simple lookup with key-as-fallback (messages already include EN fallback). */
export function makeT(messages: Messages) {
  return (key: string): string => messages[key] ?? key;
}
