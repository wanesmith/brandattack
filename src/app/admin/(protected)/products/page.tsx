import Link from "next/link";
import Image from "next/image";
import { asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; page?: string }>;

const PAGE_SIZE = 25;

export default async function ProductsAdmin({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const whereClause = q
    ? or(
        ilike(schema.products.title, `%${q}%`),
        ilike(schema.products.articleNo, `%${q}%`)
      )
    : undefined;

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
          .where(sql`${schema.variants.productId} = ANY(${productIds})`)
          .groupBy(schema.variants.productId)
      : [];
  const statsByProduct = new Map(variantStats.map((v) => [v.productId, v]));

  const firstImagesRows =
    productIds.length > 0
      ? await db
          .select({ productId: schema.productImages.productId, url: schema.productImages.url })
          .from(schema.productImages)
          .where(
            sql`${schema.productImages.productId} = ANY(${productIds}) AND ${schema.productImages.position} = 1`
          )
      : [];
  const imageByProduct = new Map(firstImagesRows.map((r) => [r.productId, r.url]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link
          href="/admin/import"
          className="rounded-sm bg-[var(--accent)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:opacity-90"
        >
          Import new lot
        </Link>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {total.toLocaleString()} total · page {page} of {totalPages}
      </p>

      <form className="mt-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title or ArticleNo…"
          className="w-full max-w-md rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
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
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((r) => {
              const stats = statsByProduct.get(r.id);
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
                  <td className="px-4 py-2">
                    <Link href={`/p/${r.id}`} className="hover:text-[var(--accent)]">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{r.articleNo}</td>
                  <td className="px-4 py-2 text-[var(--muted)]">{r.division}</td>
                  <td className="px-4 py-2">${Number(r.priceUsd).toFixed(0)}</td>
                  <td className="px-4 py-2">
                    {stats ? `${stats.stock} (${stats.variantCount} sz)` : "—"}
                  </td>
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
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
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
            href={`/admin/products?${new URLSearchParams({ ...(q && { q }), page: String(page - 1) })}`}
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
            href={`/admin/products?${new URLSearchParams({ ...(q && { q }), page: String(page + 1) })}`}
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
