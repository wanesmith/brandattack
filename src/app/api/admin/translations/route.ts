import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";
import { isLocale } from "@/lib/i18n/config";
import { DEFAULTS, MESSAGE_KEYS } from "@/lib/i18n/messages";

export const runtime = "nodejs";

// Save translation overrides for one locale. A value that's blank or identical
// to the built-in default removes the override (reverts to default).
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { locale?: unknown; values?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const locale = typeof body.locale === "string" ? body.locale : "";
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  const values =
    body.values && typeof body.values === "object"
      ? (body.values as Record<string, unknown>)
      : {};

  const keySet = new Set(MESSAGE_KEYS);
  const defaults = DEFAULTS[locale];
  const upserts: { key: string; value: string }[] = [];
  const deletes: string[] = [];

  for (const [key, raw] of Object.entries(values)) {
    if (!keySet.has(key)) continue;
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value || value === (defaults[key] ?? "")) deletes.push(key);
    else upserts.push({ key, value });
  }

  await db.transaction(async (tx) => {
    for (const u of upserts) {
      await tx
        .insert(schema.translations)
        .values({ locale, key: u.key, value: u.value })
        .onConflictDoUpdate({
          target: [schema.translations.locale, schema.translations.key],
          set: { value: u.value, updatedAt: new Date() },
        });
    }
    for (const k of deletes) {
      await tx
        .delete(schema.translations)
        .where(and(eq(schema.translations.locale, locale), eq(schema.translations.key, k)));
    }
  });

  return NextResponse.json({ ok: true, saved: upserts.length, reverted: deletes.length });
}
