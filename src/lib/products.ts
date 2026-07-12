import "server-only";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export { formatUsd, discountPercent } from "./format";

export type Variant = {
  size: string;
  sizeLabel: string;
  stock: number;
  sku: string;
};

export type Product = {
  id: string;
  articleNo: string;
  title: string;
  description: string;
  brand: string;
  division: "APPAREL" | "FOOTWEAR" | "HARDWARE";
  gender: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
  sportsCode: string;
  productGroup: string;
  productType: string;
  season: string;
  rrpUsd: number;
  priceUsd: number;
  totalStock: number;
  images: string[];
  variants: Variant[];
};

type ProductRow = typeof schema.products.$inferSelect;

function rowToProduct(
  row: ProductRow,
  images: string[],
  variants: Variant[]
): Product {
  return {
    id: row.id,
    articleNo: row.articleNo,
    title: row.title,
    description: row.description,
    brand: row.brand,
    division: row.division,
    gender: row.gender,
    sportsCode: row.sportsCode,
    productGroup: row.productGroup,
    productType: row.productType,
    season: row.season,
    rrpUsd: Number(row.rrpUsd),
    priceUsd: Number(row.priceUsd),
    totalStock: variants.reduce((sum, v) => sum + v.stock, 0),
    images,
    variants,
  };
}

async function hydrate(rows: ProductRow[]): Promise<Product[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [imgs, vars] = await Promise.all([
    db
      .select()
      .from(schema.productImages)
      .where(inArray(schema.productImages.productId, ids))
      .orderBy(asc(schema.productImages.productId), asc(schema.productImages.position)),
    db
      .select()
      .from(schema.variants)
      .where(inArray(schema.variants.productId, ids))
      .orderBy(asc(schema.variants.productId), asc(schema.variants.size)),
  ]);

  const imgsByProduct = new Map<string, string[]>();
  for (const i of imgs) {
    const arr = imgsByProduct.get(i.productId) ?? [];
    arr.push(i.url);
    imgsByProduct.set(i.productId, arr);
  }

  const varsByProduct = new Map<string, Variant[]>();
  for (const v of vars) {
    const arr = varsByProduct.get(v.productId) ?? [];
    arr.push({ sku: v.sku, size: v.size, sizeLabel: v.sizeLabel, stock: v.stock });
    varsByProduct.set(v.productId, arr);
  }

  return rows.map((r) =>
    rowToProduct(r, imgsByProduct.get(r.id) ?? [], varsByProduct.get(r.id) ?? [])
  );
}

export type Filters = {
  division?: string;
  gender?: string;
  sportsCode?: string;
  productGroup?: string;
  season?: string;
  brand?: string;
  q?: string;
};

export async function getAllProducts(): Promise<Product[]> {
  const rows = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.active, true))
    .orderBy(asc(schema.products.title));
  return hydrate(rows);
}

/** Map image URLs → the product id they belong to (for linking hero slides). */
export async function getProductIdsByImageUrls(
  urls: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (urls.length === 0) return map;
  const rows = await db
    .select({ url: schema.productImages.url, productId: schema.productImages.productId })
    .from(schema.productImages)
    .where(inArray(schema.productImages.url, urls));
  for (const r of rows) if (!map.has(r.url)) map.set(r.url, r.productId);
  return map;
}

/**
 * The hero-carousel images used when the admin hasn't set any: the category
 * heroes plus a few product shots, deduped. Shared by the landing page and the
 * admin settings preview so both show the same "current" images.
 */
export async function getDefaultHeroImages(limit = 6): Promise<string[]> {
  const [all, heroMen, heroWomen, heroKids, heroFootwear, heroApparel] = await Promise.all([
    getAllProducts(),
    getCategoryHero("gender", "MEN"),
    getCategoryHero("gender", "WOMEN"),
    getCategoryHero("gender", "KIDS"),
    getCategoryHero("division", "FOOTWEAR"),
    getCategoryHero("division", "APPAREL"),
  ]);
  return Array.from(
    new Set(
      [
        heroFootwear?.url,
        heroMen?.url,
        heroWomen?.url,
        heroApparel?.url,
        heroKids?.url,
        ...all.slice(0, limit).map((p) => p.images[0]),
      ].filter((u): u is string => Boolean(u))
    )
  ).slice(0, limit);
}

export async function filterProducts(filters: Filters): Promise<Product[]> {
  const conditions = [eq(schema.products.active, true)];
  if (filters.division) {
    conditions.push(
      eq(schema.products.division, filters.division as ProductRow["division"])
    );
  }
  if (filters.gender) {
    conditions.push(
      eq(schema.products.gender, filters.gender as ProductRow["gender"])
    );
  }
  if (filters.sportsCode) {
    conditions.push(eq(schema.products.sportsCode, filters.sportsCode));
  }
  if (filters.productGroup) {
    conditions.push(eq(schema.products.productGroup, filters.productGroup));
  }
  if (filters.season) {
    conditions.push(eq(schema.products.season, filters.season));
  }
  if (filters.brand) {
    conditions.push(eq(schema.products.brand, filters.brand));
  }
  if (filters.q && filters.q.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    conditions.push(
      // @ts-expect-error or() return type is compatible at runtime
      or(
        ilike(schema.products.title, pattern),
        ilike(schema.products.articleNo, pattern),
        ilike(schema.products.productGroup, pattern)
      )
    );
  }

  const rows = await db
    .select()
    .from(schema.products)
    .where(and(...conditions))
    .orderBy(asc(schema.products.title));
  return hydrate(rows);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const rows = await db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.id, slug), eq(schema.products.active, true)))
    .limit(1);
  if (rows.length === 0) return undefined;
  const [p] = await hydrate(rows);
  return p;
}

export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.active, true));
  return rows.map((r) => r.id);
}

export async function uniqueValuesFor(
  column: "division" | "gender" | "sportsCode"
): Promise<string[]> {
  const col =
    column === "division"
      ? schema.products.division
      : column === "gender"
        ? schema.products.gender
        : schema.products.sportsCode;
  const rows = await db
    .selectDistinct({ v: col })
    .from(schema.products)
    .where(eq(schema.products.active, true))
    .orderBy(asc(col));
  return rows.map((r) => r.v as string).filter(Boolean);
}

/**
 * Pick one representative cover image per category for the lookbook tiles.
 * Returns a map of facet=>imageUrl. Falls back to any product image if a
 * specific match isn't available.
 */
export async function getCategoryHero(
  facet: "division" | "gender",
  value: string
): Promise<{ url: string; slug: string; title: string } | null> {
  const col = facet === "division" ? schema.products.division : schema.products.gender;
  const rows = await db
    .select({
      id: schema.products.id,
      title: schema.products.title,
      url: schema.productImages.url,
    })
    .from(schema.products)
    .innerJoin(
      schema.productImages,
      and(
        eq(schema.productImages.productId, schema.products.id),
        eq(schema.productImages.position, 1)
      )
    )
    .where(
      and(
        eq(schema.products.active, true),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eq(col as any, value as any)
      )
    )
    .limit(8);
  if (rows.length === 0) return null;
  // Deterministic pick: hash of value so the same value always gets the same image
  const pick = rows[Math.abs(hash(value)) % rows.length];
  return { url: pick.url, slug: pick.id, title: pick.title };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

/**
 * Latest-added products (proxy for "Just In") — by updatedAt desc.
 */
export async function getJustInProducts(limit = 8): Promise<Product[]> {
  const rows = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.active, true))
    .orderBy(sql`${schema.products.updatedAt} DESC NULLS LAST`)
    .limit(limit);
  return hydrate(rows);
}

/**
 * Biggest discounts for "Last Chance" section. We compute (rrp - price) / rrp
 * on the DB side to avoid pulling everything.
 */
export async function getBiggestDiscounts(limit = 8): Promise<Product[]> {
  const rows = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.active, true),
        sql`${schema.products.rrpUsd} > 0`
      )
    )
    .orderBy(
      sql`(${schema.products.rrpUsd} - ${schema.products.priceUsd}) / NULLIF(${schema.products.rrpUsd}, 0) DESC`
    )
    .limit(limit);
  return hydrate(rows);
}

export async function getRelatedProducts(
  productId: string,
  productGroup: string,
  limit = 4
): Promise<Product[]> {
  const rows = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.active, true),
        eq(schema.products.productGroup, productGroup),
        sql`${schema.products.id} != ${productId}`
      )
    )
    .limit(limit);
  return hydrate(rows);
}

