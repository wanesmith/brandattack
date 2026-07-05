import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { saveSettings } from "@/lib/settings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  let body: { values?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const values = body?.values;
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    return NextResponse.json({ error: "Bad payload: expected { values: {...} }" }, { status: 400 });
  }

  try {
    await saveSettings(values as Record<string, unknown>);
  } catch (err) {
    console.error("[/api/admin/settings] save failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  // Branding is rendered in the root layout (header/footer/metadata), so purge
  // the full route cache to make edits go live without a redeploy.
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true });
}
