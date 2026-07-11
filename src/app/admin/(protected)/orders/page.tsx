import Link from "next/link";
import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const STATUSES = ["all", ...schema.orderStatusEnum.enumValues];
const FULFILLED = ["all", "unfulfilled", "fulfilled"] as const;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  fulfilled?: string;
  page?: string;
}>;

export default async function OrdersAdmin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = (STATUSES as string[]).includes(sp.status ?? "") ? sp.status! : "all";
  const fulfilled = (FULFILLED as readonly string[]).includes(sp.fulfilled ?? "")
    ? sp.fulfilled!
    : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];
  if (q) {
    conditions.push(
      or(ilike(schema.orders.email, `%${q}%`), ilike(sql`${schema.orders.id}::text`, `%${q}%`))
    );
  }
  if (status !== "all") {
    conditions.push(eq(schema.orders.status, status as (typeof schema.orderStatusEnum.enumValues)[number]));
  }
  if (fulfilled === "fulfilled") conditions.push(isNotNull(schema.orders.fulfilledAt));
  if (fulfilled === "unfulfilled") conditions.push(isNull(schema.orders.fulfilledAt));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const base = db.select().from(schema.orders);
  const orders = await (where ? base.where(where) : base)
    .orderBy(desc(schema.orders.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const totalQuery = db.select({ n: count() }).from(schema.orders);
  const totalRow = await (where ? totalQuery.where(where) : totalQuery);
  const total = Number(totalRow[0]?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterParams: Record<string, string> = {};
  if (q) filterParams.q = q;
  if (status !== "all") filterParams.status = status;
  if (fulfilled !== "all") filterParams.fulfilled = fulfilled;
  const pageHref = (p: number) =>
    `/admin/orders?${new URLSearchParams({ ...filterParams, page: String(p) })}`;

  const selectCls =
    "rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";

  return (
    <div>
      <h1 className="text-3xl font-bold">Orders</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {total.toLocaleString()} total · page {page} of {totalPages}
      </p>

      <form className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search email or order ID…"
          className="min-w-[16rem] flex-1 rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
        <select name="status" defaultValue={status} className={selectCls} aria-label="Status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <select name="fulfilled" defaultValue={fulfilled} className={selectCls} aria-label="Fulfilment">
          <option value="all">All</option>
          <option value="unfulfilled">Unfulfilled</option>
          <option value="fulfilled">Fulfilled</option>
        </select>
        <button
          type="submit"
          className="rounded-sm border border-[var(--accent)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black"
        >
          Apply
        </button>
        {(q || status !== "all" || fulfilled !== "all") && (
          <Link
            href="/admin/orders"
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
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fulfilment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                  No orders match.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-[var(--background)]">
                  <td className="px-4 py-2 text-[var(--muted)]">{o.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link href={`/admin/orders/${o.id}`} className="hover:text-[var(--accent)] hover:underline">
                      {o.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{o.email}</td>
                  <td className="px-4 py-2">{formatUsd(Number(o.totalUsd))}</td>
                  <td className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    {o.status}
                  </td>
                  <td className="px-4 py-2">
                    {o.fulfilledAt ? (
                      <span className="rounded-sm bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                        ✓ Fulfilled
                      </span>
                    ) : (
                      <span className="rounded-sm bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
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
