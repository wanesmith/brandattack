import Link from "next/link";
import Image from "next/image";
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  division?: string;
  gender?: string;
  status?: string;
  page?: string;
}>;

const PAGE_SIZE = 25;

const DIVISIONS = schema.divisionEnum.enumValues;
const GENDERS = schema.genderEnum.enumValues;
const STATUSES = ["all", "active", "hidden"] as const;

export default async function ProductsAdmin({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const division = (DIVISIONS as readonly string[]).includes(sp.division ?? "")
    ? (sp.division as (typeof DIVISIONS)[number])
    : "";
  const gender = (GENDERS as readonly string[]).includes(sp.gender ?? "")
    ? (sp.gender as (typeof GENDERS)[number])
    : "";
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof STATUSES)[number])
    : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];
  if (q) {
    conditions.push(
      or(
        ilike(schema.products.title, `%${q}%`),
        ilike(schema.products.articleNo, `%${q}%`)
      )
    );
  }
  if (division) conditions.push(eq(schema.products.division, division));
  if (gender) conditions.push(eq(schema.products.gender, gender));
  if (status === "active") conditions.push(eq(schema.products.active, true));
  if (status === "hidden") conditions.push(eq(schema.products.active, false));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db.select().from(schema.products);
  const rows = await (whereClause ? baseQuery.where(whereClause) : baseQuery)
    .orderBy(asc(schema.products.title))
    .limit(PAGE_SIZE)
    .offset(offset);

  const totalQuery = db.select({ n: count() }).from(schema.products);
  const totalRow = await (whereClause ? totalQuery.where(whereClause) : totalQuery);
  const total = Number(totalRow[0]?.n ?? 0);

  // Variant counts + stock per product
  const productIds = rows.map((r) => r.id);
  const variantStats =
    productIds.length > 0
      ? await db
          .select({
            productId: schema.variants.productId,
            variantCount: count(),
            stock: sql<number>`COALESCE(SUM(${schema.variants.stock}), 0)::int`,
          })
          .from(schema.variants)
          .where(inArray(schema.variants.productId, productIds))
          .groupBy(schema.variants.productId)
      : [];
  const statsByProduct = new Map(variantStats.map((v) => [v.productId, v]));

  const firstImagesRows =
    productIds.length > 0
      ? await db
          .select({ productId: schema.productImages.productId, url: schema.productImages.url })
          .from(schema.productImages)
          .where(
            and(
              inArray(schema.productImages.productId, productIds),
              eq(schema.productImages.position, 1)
            )
          )
      : [];
  const imageByProduct = new Map(firstImagesRows.map((r) => [r.productId, r.url]));

  // Sales stats per product: units sold + revenue from orders that count as a
  // sale (paid or shipped). order_items link to products via sku → variant.
  const salesStats =
    productIds.length > 0
      ? await db
          .select({
            productId: schema.variants.productId,
            units: sql<number>`COALESCE(SUM(${schema.orderItems.qty}), 0)::int`,
            revenue: sql<number>`COALESCE(SUM(${schema.orderItems.qty} * ${schema.orderItems.unitPriceUsd}), 0)::float`,
          })
          .from(schema.orderItems)
          .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
          .innerJoin(schema.variants, eq(schema.variants.sku, schema.orderItems.sku))
          .where(
            and(
              inArray(schema.variants.productId, productIds),
              inArray(schema.orders.status, ["paid", "shipped"])
            )
          )
          .groupBy(schema.variants.productId)
      : [];
  const salesByProduct = new Map(salesStats.map((s) => [s.productId, s]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Preserve active filters across pagination.
  const filterParams: Record<string, string> = {};
  if (q) filterParams.q = q;
  if (division) filterParams.division = division;
  if (gender) filterParams.gender = gender;
  if (status !== "all") filterParams.status = status;
  const hasFilters = Object.keys(filterParams).length > 0;
  const pageHref = (p: number) =>
    `/admin/products?${new URLSearchParams({ ...filterParams, page: String(p) })}`;

  const selectClass =
    "rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products/new"
            className="rounded-sm border border-[var(--accent)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black"
          >
            New product
          </Link>
          <Link
            href="/admin/import"
            className="rounded-sm bg-[var(--accent)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:opacity-90"
          >
            Import new lot
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {total.toLocaleString()} total · page {page} of {totalPages}
      </p>

      <form className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title or ArticleNo…"
          className="min-w-[16rem] flex-1 rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />

        <select name="division" defaultValue={division} className={selectClass} aria-label="Division">
          <option value="">All divisions</option>
          {DIVISIONS.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0) + d.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <select name="gender" defaultValue={gender} className={selectClass} aria-label="Gender">
          <option value="">All genders</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g.charAt(0) + g.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <select name="status" defaultValue={status} className={selectClass} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>

        <button
          type="submit"
          className="rounded-sm border border-[var(--accent)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black"
        >
          Apply
        </button>
        {hasFilters && (
          <Link
            href="/admin/products"
            className="font-mono text-xs uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)]"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--background)] text-left font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="w-16 px-4 py-3"></th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">ArticleNo</th>
              <th className="px-4 py-3">Division</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Sold</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((r) => {
              const stats = statsByProduct.get(r.id);
              const sales = salesByProduct.get(r.id);
              const img = imageByProduct.get(r.id);
              return (
                <tr key={r.id} className="hover:bg-[var(--background)]">
                  <td className="px-4 py-2">
                    <div className="relative h-10 w-10 overflow-hidden rounded-sm bg-[var(--background)]">
                      {img && (
                        <Image src={img} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/admin/products/${r.id}`} className="hover:text-[var(--accent)] hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.articleNo}</td>
                  <td className="px-4 py-2 text-[var(--muted)]">{r.division}</td>
                  <td className="px-4 py-2">{formatUsd(Number(r.priceUsd))}</td>
                  <td className="px-4 py-2">
                    {stats ? `${stats.stock} (${stats.variantCount} sz)` : "—"}
                  </td>
                  <td className="px-4 py-2">{sales ? Number(sales.units).toLocaleString() : 0}</td>
                  <td className="px-4 py-2">{formatUsd(sales ? Number(sales.revenue) : 0)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        r.active
                          ? "rounded-sm bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300"
                          : "rounded-sm bg-zinc-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400"
                      }
                    >
                      {r.active ? "Active" : "Hidden"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                  No products match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <Link
            href={pageHref(page - 1)}
            className={
              "rounded border border-[var(--border)] px-3 py-1.5 " +
              (page <= 1 ? "pointer-events-none opacity-30" : "hover:border-[var(--accent)]")
            }
          >
            ← Prev
          </Link>
          <span className="text-[var(--muted)]">
            Page {page} / {totalPages}
          </span>
          <Link
            href={pageHref(page + 1)}
            className={
              "rounded border border-[var(--border)] px-3 py-1.5 " +
              (page >= totalPages ? "pointer-events-none opacity-30" : "hover:border-[var(--accent)]")
            }
          >
            Next →
          </Link>
        </nav>
      )}
    </div>
  );
}
