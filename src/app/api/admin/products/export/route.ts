import { and, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIVISIONS = schema.divisionEnum.enumValues;
const GENDERS = schema.genderEnum.enumValues;

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Exports the products list (respecting the same filters as the admin page) as
// CSV — including total units, stock, sold, revenue and status.
export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const division = (DIVISIONS as readonly string[]).includes(url.searchParams.get("division") ?? "")
    ? (url.searchParams.get("division") as (typeof DIVISIONS)[number])
    : "";
  const gender = (GENDERS as readonly string[]).includes(url.searchParams.get("gender") ?? "")
    ? (url.searchParams.get("gender") as (typeof GENDERS)[number])
    : "";
  const status = url.searchParams.get("status") ?? "all";

  const conditions = [];
  if (q) {
    conditions.push(
      or(ilike(schema.products.title, `%${q}%`), ilike(schema.products.articleNo, `%${q}%`))
    );
  }
  if (division) conditions.push(eq(schema.products.division, division));
  if (gender) conditions.push(eq(schema.products.gender, gender));
  if (status === "active") conditions.push(eq(schema.products.active, true));
  if (status === "hidden") conditions.push(eq(schema.products.active, false));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const base = db.select().from(schema.products);
  const products = await (where ? base.where(where) : base).orderBy(schema.products.title);
  const ids = products.map((p) => p.id);

  const variantStats = ids.length
    ? await db
        .select({
          productId: schema.variants.productId,
          variantCount: count(),
          stock: sql<number>`COALESCE(SUM(${schema.variants.stock}), 0)::int`,
        })
        .from(schema.variants)
        .where(inArray(schema.variants.productId, ids))
        .groupBy(schema.variants.productId)
    : [];
  const statsByProduct = new Map(variantStats.map((v) => [v.productId, v]));

  const salesStats = ids.length
    ? await db
        .select({
          productId: schema.variants.productId,
          units: sql<number>`COALESCE(SUM(${schema.orderItems.qty}), 0)::int`,
          revenue: sql<number>`COALESCE(SUM(${schema.orderItems.qty} * ${schema.orderItems.unitPriceUsd}), 0)::float`,
        })
        .from(schema.orderItems)
        .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
        .innerJoin(schema.variants, eq(schema.variants.sku, schema.orderItems.sku))
        .where(and(inArray(schema.variants.productId, ids), inArray(schema.orders.status, ["paid", "shipped"])))
        .groupBy(schema.variants.productId)
    : [];
  const salesByProduct = new Map(salesStats.map((s) => [s.productId, s]));

  const header = [
    "ArticleNo",
    "Title",
    "Brand",
    "Division",
    "Gender",
    "Season",
    "Price (USD)",
    "RRP (USD)",
    "Total units",
    "In stock",
    "Sold",
    "Revenue (USD)",
    "Status",
  ];
  const lines = [header.join(",")];
  for (const p of products) {
    const s = statsByProduct.get(p.id);
    const sale = salesByProduct.get(p.id);
    const stock = s ? Number(s.stock) : 0;
    const sold = sale ? Number(sale.units) : 0;
    lines.push(
      [
        p.articleNo,
        p.title,
        p.brand,
        p.division,
        p.gender,
        p.season,
        Number(p.priceUsd).toFixed(2),
        Number(p.rrpUsd).toFixed(2),
        stock + sold,
        stock,
        sold,
        (sale ? Number(sale.revenue) : 0).toFixed(2),
        p.active ? "Active" : "Hidden",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brand-stoxx-products-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
