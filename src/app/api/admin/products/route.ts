import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type IncomingVariant = { sku?: unknown; size?: unknown; stock?: unknown };
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
    .select({ id: schema.products.id, articleNo: schema.products.articleNo })
    .from(schema.products)
    .where(eq(schema.products.id, id))
    .limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  const articleNo = existing[0].articleNo;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const priceUsd = money(body.priceUsd);
  const rrpUsd = money(body.rrpUsd);
  if (priceUsd === null || rrpUsd === null) {
    return NextResponse.json({ error: "Price and RRP must be valid amounts" }, { status: 400 });
  }

  // Desired variant set (when provided). Existing rows carry a sku; new sizes
  // carry a `size` and no sku. `undefined` leaves variants untouched.
  const desiredVariants = Array.isArray(body.variants)
    ? (body.variants as IncomingVariant[])
        .map((v) => ({
          sku: typeof v?.sku === "string" ? v.sku.trim() : "",
          size: typeof v?.size === "string" ? v.size.trim() : "",
          stock: Math.max(0, Math.floor(Number(v?.stock) || 0)),
        }))
        .filter((v) => v.sku || v.size)
    : null;

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

    if (desiredVariants !== null) {
      const current = await tx
        .select({ sku: schema.variants.sku, reserved: schema.variants.reserved })
        .from(schema.variants)
        .where(eq(schema.variants.productId, id));
      const currentSkus = new Set(current.map((c) => c.sku));
      const keep = new Set<string>();

      for (const v of desiredVariants) {
        // Resolve the target sku: existing one, or generate from size.
        let sku = v.sku && currentSkus.has(v.sku) ? v.sku : "";
        if (!sku && v.size) sku = `${articleNo}-${v.size.replace(/\//g, "_")}`;
        if (!sku) continue;

        if (currentSkus.has(sku)) {
          await tx
            .update(schema.variants)
            .set({ stock: v.stock })
            .where(and(eq(schema.variants.sku, sku), eq(schema.variants.productId, id)));
        } else {
          const label = v.size || sku;
          await tx
            .insert(schema.variants)
            .values({ sku, productId: id, size: v.size || label, sizeLabel: label, stock: v.stock, reserved: 0 })
            .onConflictDoNothing();
        }
        keep.add(sku);
      }

      // Remove sizes the admin deleted — but never a variant with stock held
      // by an in-flight checkout.
      for (const c of current) {
        if (!keep.has(c.sku) && c.reserved <= 0) {
          await tx.delete(schema.variants).where(eq(schema.variants.sku, c.sku));
        }
      }
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
