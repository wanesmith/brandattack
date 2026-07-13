import "server-only";
import { and, asc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
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

// Facet filters are multi-select (OR within a facet, AND across facets).
export type Filters = {
  division?: string[];
  gender?: string[];
  sportsCode?: string[];
  productGroup?: string[];
  season?: string[];
  brand?: string[];
  size?: string[];
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

const APPAREL_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL", "5XL"];

// A shoe/kids size only if the WHOLE label is numeric (so "2XL" isn't read as 2).
function shoeSize(s: string): { n: number; kids: boolean } | null {
  const m = s.trim().match(/^(\d+(?:\.5)?)(\s*\(kids\))?$/i);
  return m ? { n: parseFloat(m[1]), kids: Boolean(m[2]) } : null;
}

// Sort sizes sensibly: adult shoe numerics, then kids numerics, then apparel
// letters in wear order, then anything else alphabetically.
function compareSizes(a: string, b: string): number {
  const va = shoeSize(a);
  const vb = shoeSize(b);
  if (va && vb) return va.kids !== vb.kids ? (va.kids ? 1 : -1) : va.n - vb.n;
  if (va || vb) return va ? -1 : 1;
  const ia = APPAREL_ORDER.indexOf(a.toUpperCase());
  const ib = APPAREL_ORDER.indexOf(b.toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1 || ib !== -1) return ia !== -1 ? -1 : 1;
  return a.localeCompare(b);
}

const APPAREL_SIZES = new Set([
  "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL",
  "2XL", "3XL", "4XL", "5XL",
]);

// The source apparel sizing is inconsistent (chest codes, measurements, etc.),
// so the sidebar lists only standard, recognizable sizes: shoe numerics up to
// 20 (incl. half + kids) and standard apparel letters. The filter itself still
// works for any exact size label via the URL.
function isStandardSize(raw: string): boolean {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2})(\.5)?(\s*\(kids\))?$/i);
  if (m) {
    const n = parseFloat(s);
    return n > 0 && n <= 20;
  }
  return APPAREL_SIZES.has(s.toUpperCase());
}

// Product-level WHERE conditions shared by filterProducts and the size facet.
// `includeSize` controls whether the size filter itself is applied (the size
// facet omits it so its options reflect the other active filters).
function productFilterConditions(filters: Filters, includeSize: boolean) {
  const conditions = [eq(schema.products.active, true)];
  if (filters.division?.length) {
    conditions.push(inArray(schema.products.division, filters.division as ProductRow["division"][]));
  }
  if (filters.gender?.length) {
    conditions.push(inArray(schema.products.gender, filters.gender as ProductRow["gender"][]));
  }
  if (filters.sportsCode?.length) conditions.push(inArray(schema.products.sportsCode, filters.sportsCode));
  if (filters.productGroup?.length) conditions.push(inArray(schema.products.productGroup, filters.productGroup));
  if (filters.season?.length) conditions.push(inArray(schema.products.season, filters.season));
  if (filters.brand?.length) conditions.push(inArray(schema.products.brand, filters.brand));
  if (includeSize && filters.size?.length) {
    const withSize = db
      .select({ id: schema.variants.productId })
      .from(schema.variants)
      .where(and(inArray(schema.variants.sizeLabel, filters.size), gt(schema.variants.stock, 0)));
    conditions.push(inArray(schema.products.id, withSize));
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
  return conditions;
}

/**
 * Distinct standard size labels in stock among products matching the current
 * filters (so Men's won't list kids sizes, etc.). The size filter itself is
 * excluded so all sizes valid for the context stay switchable.
 */
export async function getAvailableSizes(filters: Filters = {}): Promise<string[]> {
  const conditions = productFilterConditions(filters, false);
  const rows = await db
    .selectDistinct({ sizeLabel: schema.variants.sizeLabel })
    .from(schema.variants)
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .where(and(...conditions, gt(schema.variants.stock, 0)));
  // Kids sizes only make sense in the Kids context; a handful of adult products
  // are mis-tagged with a kids variant in the source, so exclude them elsewhere.
  const genders = filters.gender ?? [];
  const hideKids = genders.length > 0 && !genders.includes("KIDS");
  return rows
    .map((r) => r.sizeLabel)
    .filter((s): s is string => Boolean(s && s.trim()))
    .filter(isStandardSize)
    .filter((s) => !(hideKids && /\(kids\)/i.test(s)))
    .sort(compareSizes);
}

export async function filterProducts(filters: Filters): Promise<Product[]> {
  const conditions = productFilterConditions(filters, true);
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

