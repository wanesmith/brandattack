import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DIVISIONS = schema.divisionEnum.enumValues;
const GENDERS = schema.genderEnum.enumValues;

const money = (v: unknown): string | null => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
};
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const articleNo = str(body.articleNo);
  const title = str(body.title);
  const division = str(body.division).toUpperCase();
  const gender = str(body.gender).toUpperCase();
  const priceUsd = money(body.priceUsd);
  const rrpUsd = money(body.rrpUsd);

  if (!articleNo) return NextResponse.json({ error: "Article number is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!(DIVISIONS as readonly string[]).includes(division))
    return NextResponse.json({ error: `Division must be one of: ${DIVISIONS.join(", ")}` }, { status: 400 });
  if (!(GENDERS as readonly string[]).includes(gender))
    return NextResponse.json({ error: `Gender must be one of: ${GENDERS.join(", ")}` }, { status: 400 });
  if (priceUsd === null || rrpUsd === null)
    return NextResponse.json({ error: "Price and RRP must be valid amounts" }, { status: 400 });

  const id = `${articleNo.toLowerCase()}-${slugify(title) || articleNo.toLowerCase()}`;

  // Reject duplicates on either the generated id or the unique articleNo.
  const clash = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(or(eq(schema.products.id, id), eq(schema.products.articleNo, articleNo)))
    .limit(1);
  if (clash.length > 0) {
    return NextResponse.json(
      { error: "A product with that article number already exists." },
      { status: 409 }
    );
  }

  // Variants: [{ size, stock }] → sku = <articleNo>-<size>
  const rawVariants = Array.isArray(body.variants) ? body.variants : [];
  const seen = new Set<string>();
  const variants = rawVariants
    .map((v) => {
      const rec = v as Record<string, unknown>;
      const size = str(rec.size);
      const stock = Math.max(0, Math.floor(Number(rec.stock) || 0));
      return { size, stock };
    })
    .filter((v) => v.size && !seen.has(v.size) && (seen.add(v.size), true));

  await db.transaction(async (tx) => {
    await tx.insert(schema.products).values({
      id,
      articleNo,
      title,
      description: str(body.description),
      brand: str(body.brand) || "Adidas",
      division: division as (typeof DIVISIONS)[number],
      gender: gender as (typeof GENDERS)[number],
      sportsCode: str(body.sportsCode).toUpperCase(),
      productGroup: str(body.productGroup).toUpperCase(),
      productType: str(body.productType).toUpperCase(),
      season: str(body.season),
      rrpUsd,
      priceUsd,
      active: body.active === undefined ? true : Boolean(body.active),
      updatedAt: new Date(),
    });

    if (variants.length > 0) {
      await tx.insert(schema.variants).values(
        variants.map((v) => ({
          sku: `${articleNo}-${v.size.replace(/\//g, "_")}`,
          productId: id,
          size: v.size,
          sizeLabel: v.size,
          stock: v.stock,
          reserved: 0,
        }))
      );
    }
  });

  return NextResponse.json({ ok: true, id });
}
