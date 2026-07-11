import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type IncomingVariant = { sku?: unknown; stock?: unknown };
type Body = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  brand?: unknown;
  priceUsd?: unknown;
  rrpUsd?: unknown;
  active?: unknown;
  variants?: unknown;
  images?: unknown;
};

const money = (v: unknown): string | null => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
};

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Product id required" }, { status: 400 });

  const existing = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.id, id))
    .limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const priceUsd = money(body.priceUsd);
  const rrpUsd = money(body.rrpUsd);
  if (priceUsd === null || rrpUsd === null) {
    return NextResponse.json({ error: "Price and RRP must be valid amounts" }, { status: 400 });
  }

  const variants: { sku: string; stock: number }[] = Array.isArray(body.variants)
    ? (body.variants as IncomingVariant[])
        .filter((v) => v && typeof v.sku === "string" && Number.isFinite(Number(v.stock)))
        .map((v) => ({ sku: String(v.sku), stock: Math.max(0, Math.floor(Number(v.stock))) }))
    : [];

  // Images: full replacement of the ordered set when provided. `undefined`
  // (key absent) leaves existing images untouched.
  const images = Array.isArray(body.images)
    ? (body.images as unknown[])
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .slice(0, 12)
    : null;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.products)
      .set({
        title,
        description: typeof body.description === "string" ? body.description : "",
        brand: typeof body.brand === "string" && body.brand.trim() ? body.brand.trim() : "Adidas",
        priceUsd,
        rrpUsd,
        active: Boolean(body.active),
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, id));

    for (const v of variants) {
      await tx
        .update(schema.variants)
        .set({ stock: v.stock })
        .where(and(eq(schema.variants.sku, v.sku), eq(schema.variants.productId, id)));
    }

    if (images !== null) {
      await tx.delete(schema.productImages).where(eq(schema.productImages.productId, id));
      if (images.length > 0) {
        await tx.insert(schema.productImages).values(
          images.map((url, i) => ({ productId: id, position: i + 1, url }))
        );
      }
    }
  });

  return NextResponse.json({ ok: true });
}
