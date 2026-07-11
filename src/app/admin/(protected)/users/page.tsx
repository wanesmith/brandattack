import Link from "next/link";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SearchParams = Promise<{ q?: string; verified?: string; page?: string }>;

export default async function UsersAdmin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const verified = ["all", "yes", "no"].includes(sp.verified ?? "") ? sp.verified! : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [];
  if (q) {
    conditions.push(
      or(ilike(schema.users.email, `%${q}%`), ilike(schema.users.name, `%${q}%`))
    );
  }
  if (verified === "yes") conditions.push(eq(schema.users.emailVerified, true));
  if (verified === "no") conditions.push(eq(schema.users.emailVerified, false));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const base = db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      emailVerified: schema.users.emailVerified,
      createdAt: schema.users.createdAt,
      hasAddress: sql<boolean>`${schema.users.shippingAddress} IS NOT NULL`,
    })
    .from(schema.users);
  const users = await (where ? base.where(where) : base)
    .orderBy(desc(schema.users.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const totalQuery = db.select({ n: count() }).from(schema.users);
  const totalRow = await (where ? totalQuery.where(where) : totalQuery);
  const total = Number(totalRow[0]?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Orders count per shown customer (by email).
  const emails = users.map((u) => u.email);
  const orderCounts =
    emails.length > 0
      ? await db
          .select({ email: schema.orders.email, n: count() })
          .from(schema.orders)
          .where(inArray(schema.orders.email, emails))
          .groupBy(schema.orders.email)
      : [];
  const ordersByEmail = new Map(orderCounts.map((r) => [r.email, Number(r.n)]));

  const filterParams: Record<string, string> = {};
  if (q) filterParams.q = q;
  if (verified !== "all") filterParams.verified = verified;
  const pageHref = (p: number) =>
    `/admin/users?${new URLSearchParams({ ...filterParams, page: String(p) })}`;

  const selectCls =
    "rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";

  return (
    <div>
      <h1 className="text-3xl font-bold">Customers</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {total.toLocaleString()} registered · page {page} of {totalPages}
      </p>

      <form className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search email or name…"
          className="min-w-[16rem] flex-1 rounded-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
        <select name="verified" defaultValue={verified} className={selectCls} aria-label="Verified">
          <option value="all">All</option>
          <option value="yes">Verified</option>
          <option value="no">Unverified</option>
        </select>
        <button
          type="submit"
          className="rounded-sm border border-[var(--accent)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black"
        >
          Apply
        </button>
        {(q || verified !== "all") && (
          <Link
            href="/admin/users"
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
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                  No customers match.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--background)]">
                  <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-2">{u.name || "—"}</td>
                  <td className="px-4 py-2">
                    {u.emailVerified ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                        Verified
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{ordersByEmail.get(u.email) ?? 0}</td>
                  <td className="px-4 py-2 text-[var(--muted)]">{u.hasAddress ? "✓" : "—"}</td>
                  <td className="px-4 py-2 text-[var(--muted)]">{u.createdAt.toLocaleDateString()}</td>
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
