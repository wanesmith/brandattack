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

  const DIVISIONS = schema.divisionEnum.enumValues as readonly string[];
  const GENDERS = schema.genderEnum.enumValues as readonly string[];
  const divisionParam = url.searchParams.get("division") ?? "";
  const genderParam = url.searchParams.get("gender") ?? "";

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
  if (DIVISIONS.includes(divisionParam)) {
    conditions.push(eq(schema.products.division, divisionParam as (typeof schema.divisionEnum.enumValues)[number]));
  }
  if (GENDERS.includes(genderParam)) {
    conditions.push(eq(schema.products.gender, genderParam as (typeof schema.genderEnum.enumValues)[number]));
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
