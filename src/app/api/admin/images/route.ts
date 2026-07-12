import { NextResponse } from "next/server";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Available catalogue images for the admin image picker: the main image of each
// active product, searchable by title / article number.
export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10) || 0);
  const PAGE_SIZE = 60;
  const conditions = [
    eq(schema.products.active, true),
    eq(schema.productImages.position, 1),
  ];
  if (q) {
    conditions.push(
      or(
        ilike(schema.products.title, `%${q}%`),
        ilike(schema.products.articleNo, `%${q}%`)
      )!
    );
  }

  const rows = await db
    .select({ url: schema.productImages.url, title: schema.products.title })
    .from(schema.productImages)
    .innerJoin(schema.products, eq(schema.products.id, schema.productImages.productId))
    .where(and(...conditions))
    .orderBy(asc(schema.products.title))
    .limit(PAGE_SIZE + 1)
    .offset(page * PAGE_SIZE);

  const hasMore = rows.length > PAGE_SIZE;
  return NextResponse.json({ images: rows.slice(0, PAGE_SIZE), hasMore });
}
