import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { defaultsFor, makeT, type Messages } from "./messages";

/** Current locale from the cookie, defaulting to English. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Built-in defaults for the locale with any admin DB overrides layered on. */
export async function getMessages(locale: Locale): Promise<Messages> {
  const messages = defaultsFor(locale);
  try {
    const rows = await db
      .select()
      .from(schema.translations)
      .where(eq(schema.translations.locale, locale));
    for (const r of rows) {
      if (r.value) messages[r.key] = r.value;
    }
  } catch {
    // Table missing / DB unavailable → fall back to built-in defaults.
  }
  return messages;
}

/** Convenience for server components: returns a t(key) bound to the request locale. */
export async function getT(): Promise<(key: string) => string> {
  const messages = await getMessages(await getLocale());
  return makeT(messages);
}
