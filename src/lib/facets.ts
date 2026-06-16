// Used by API routes, server components, and CLI scripts (backfill, seed).
// Don't `import "server-only"` here — it breaks CLI invocation.
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Product columns we currently support as facets.
 * Add a column here to make it eligible for the admin to expose.
 */
export const FACET_COLUMNS = {
  division: schema.products.division,
  gender: schema.products.gender,
  sportsCode: schema.products.sportsCode,
  productGroup: schema.products.productGroup,
  season: schema.products.season,
  brand: schema.products.brand,
} as const;

export type FacetId = keyof typeof FACET_COLUMNS;

/**
 * Defaults used when a facet has never been configured.
 * `visible` decides whether it shows on the shop sidebar by default.
 */
const FACET_DEFAULTS: Record<
  FacetId,
  { label: string; position: number; visible: boolean }
> = {
  division: { label: "Division", position: 10, visible: true },
  gender: { label: "Gender", position: 20, visible: true },
  sportsCode: { label: "Sport", position: 30, visible: true },
  productGroup: { label: "Category", position: 40, visible: false },
  season: { label: "Season", position: 50, visible: false },
  brand: { label: "Brand", position: 5, visible: false }, // hidden until multi-brand
};

function defaultValueLabel(raw: string): string {
  return raw
    .toLowerCase()
    .split(/\s+|_/)
    .filter(Boolean)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");
}

/**
 * Ensure each known facet has a row in `facets`, and that every distinct
 * value currently in the products table has a row in `facet_values`.
 * Does NOT touch rows the admin has already customised — only fills gaps.
 * Safe to call after each import.
 */
export async function backfillFacets(): Promise<{
  facetsInserted: number;
  valuesInserted: number;
}> {
  let facetsInserted = 0;
  let valuesInserted = 0;

  const existingFacets = await db.select({ id: schema.facets.id }).from(schema.facets);
  const existingFacetIds = new Set(existingFacets.map((f) => f.id));

  for (const [id, defaults] of Object.entries(FACET_DEFAULTS) as [FacetId, typeof FACET_DEFAULTS[FacetId]][]) {
    if (!existingFacetIds.has(id)) {
      await db.insert(schema.facets).values({
        id,
        label: defaults.label,
        position: defaults.position,
        visible: defaults.visible,
      });
      facetsInserted++;
    }
  }

  // Pull distinct values per facet from products, then insert any new ones
  // with default label/position. Enum columns can't be compared to '', so
  // filter empties out in JS.
  for (const facetId of Object.keys(FACET_COLUMNS) as FacetId[]) {
    const col = FACET_COLUMNS[facetId];
    const rows = await db
      .selectDistinct({ v: col })
      .from(schema.products)
      .where(sql`${col} IS NOT NULL`);

    const valuesSeen = rows
      .map((r) => String(r.v ?? "").trim())
      .filter((v) => v.length > 0);
    if (valuesSeen.length === 0) continue;

    const existing = await db
      .select({ value: schema.facetValues.value })
      .from(schema.facetValues)
      .where(eq(schema.facetValues.facet, facetId));
    const existingValues = new Set(existing.map((r) => r.value));

    const toInsert = valuesSeen.filter((v) => !existingValues.has(v));
    if (toInsert.length > 0) {
      const sorted = [...toInsert].sort();
      await db.insert(schema.facetValues).values(
        sorted.map((v, i) => ({
          facet: facetId,
          value: v,
          label: defaultValueLabel(v),
          position: i * 10,
          visible: true,
        }))
      );
      valuesInserted += toInsert.length;
    }
  }

  return { facetsInserted, valuesInserted };
}

export type ResolvedFacet = {
  id: FacetId;
  label: string;
  visible: boolean;
  values: { value: string; label: string; visible: boolean }[];
};

/**
 * For the shop sidebar: returns visible facets in admin-defined order,
 * each with its visible values in admin-defined order.
 */
export async function getActiveFacets(): Promise<ResolvedFacet[]> {
  const facetRows = await db
    .select()
    .from(schema.facets)
    .where(eq(schema.facets.visible, true))
    .orderBy(asc(schema.facets.position), asc(schema.facets.id));

  if (facetRows.length === 0) return [];

  const facetIds = facetRows.map((f) => f.id);
  const valueRows = await db
    .select()
    .from(schema.facetValues)
    .where(inArray(schema.facetValues.facet, facetIds))
    .orderBy(asc(schema.facetValues.position), asc(schema.facetValues.label));

  const byFacet = new Map<string, typeof valueRows>();
  for (const v of valueRows) {
    if (!v.visible) continue;
    const arr = byFacet.get(v.facet) ?? [];
    arr.push(v);
    byFacet.set(v.facet, arr);
  }

  return facetRows.map((f) => ({
    id: f.id as FacetId,
    label: f.label,
    visible: f.visible,
    values: (byFacet.get(f.id) ?? []).map((v) => ({
      value: v.value,
      label: v.label,
      visible: v.visible,
    })),
  }));
}

/**
 * For the admin /admin/filters page: returns ALL facets and ALL values,
 * including hidden ones, in current order. Includes per-value product counts.
 */
export async function getAllFacetsForAdmin(): Promise<
  Array<ResolvedFacet & { values: Array<ResolvedFacet["values"][number] & { productCount: number }> }>
> {
  const facetRows = await db
    .select()
    .from(schema.facets)
    .orderBy(asc(schema.facets.position), asc(schema.facets.id));

  const valueRows = await db
    .select()
    .from(schema.facetValues)
    .orderBy(asc(schema.facetValues.position), asc(schema.facetValues.label));

  // Product counts per (facet, value)
  const counts: Record<string, Map<string, number>> = {};
  for (const facetId of Object.keys(FACET_COLUMNS) as FacetId[]) {
    const col = FACET_COLUMNS[facetId];
    const rows = await db
      .select({ v: col, n: sql<number>`COUNT(*)::int` })
      .from(schema.products)
      .where(eq(schema.products.active, true))
      .groupBy(col);
    counts[facetId] = new Map(rows.map((r) => [String(r.v), Number(r.n)]));
  }

  const byFacet = new Map<string, typeof valueRows>();
  for (const v of valueRows) {
    const arr = byFacet.get(v.facet) ?? [];
    arr.push(v);
    byFacet.set(v.facet, arr);
  }

  return facetRows.map((f) => {
    const fcounts = counts[f.id] ?? new Map<string, number>();
    return {
      id: f.id as FacetId,
      label: f.label,
      visible: f.visible,
      values: (byFacet.get(f.id) ?? []).map((v) => ({
        value: v.value,
        label: v.label,
        visible: v.visible,
        productCount: fcounts.get(v.value) ?? 0,
      })),
    };
  });
}

export type FacetUpdate = {
  facets: Array<{ id: string; label: string; position: number; visible: boolean }>;
  values: Array<{
    facet: string;
    value: string;
    label: string;
    position: number;
    visible: boolean;
  }>;
};

export async function saveFacetConfig(update: FacetUpdate): Promise<void> {
  await db.transaction(async (tx) => {
    for (const f of update.facets) {
      await tx
        .update(schema.facets)
        .set({ label: f.label, position: f.position, visible: f.visible })
        .where(eq(schema.facets.id, f.id));
    }
    for (const v of update.values) {
      await tx
        .update(schema.facetValues)
        .set({ label: v.label, position: v.position, visible: v.visible })
        .where(
          sql`${schema.facetValues.facet} = ${v.facet} AND ${schema.facetValues.value} = ${v.value}`
        );
    }
  });
}
