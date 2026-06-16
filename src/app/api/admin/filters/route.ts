import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { saveFacetConfig, type FacetUpdate } from "@/lib/facets";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  let body: FacetUpdate;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.facets) || !Array.isArray(body.values)) {
    return NextResponse.json({ error: "Bad payload shape" }, { status: 400 });
  }

  // Light validation — clamp labels to a reasonable size, ensure types
  for (const f of body.facets) {
    if (typeof f.id !== "string" || !f.id) {
      return NextResponse.json({ error: "Facet missing id" }, { status: 400 });
    }
    if (typeof f.label !== "string") {
      return NextResponse.json({ error: `Facet ${f.id} missing label` }, { status: 400 });
    }
    f.label = f.label.slice(0, 80).trim() || f.id;
    f.position = Number.isFinite(f.position) ? f.position : 0;
    f.visible = !!f.visible;
  }
  for (const v of body.values) {
    if (typeof v.facet !== "string" || typeof v.value !== "string") {
      return NextResponse.json({ error: "Value row missing facet/value" }, { status: 400 });
    }
    if (typeof v.label !== "string") {
      return NextResponse.json(
        { error: `Value ${v.facet}/${v.value} missing label` },
        { status: 400 }
      );
    }
    v.label = v.label.slice(0, 80).trim() || v.value;
    v.position = Number.isFinite(v.position) ? v.position : 0;
    v.visible = !!v.visible;
  }

  try {
    await saveFacetConfig(body);
  } catch (err) {
    console.error("[/api/admin/filters] save failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
