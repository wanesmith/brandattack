import Link from "next/link";
import { count, eq, gte, sql, sum } from "drizzle-orm";
import { db, schema } from "@/db";
import { RecentOrderRows } from "./RecentOrderRows";

export const dynamic = "force-dynamic"; // always render fresh stats

export default async function AdminDashboard() {
  // All stats in parallel
  const [
    productsAll,
    productsActive,
    variantsRow,
    inStockUnitsRow,
    retailValueRow,
    ordersTotal,
    ordersTodayCount,
    revenueTodayRow,
    recentOrders,
  ] = await Promise.all([
    db.select({ n: count() }).from(schema.products),
    db
      .select({ n: count() })
      .from(schema.products)
      .where(eq(schema.products.active, true)),
    db.select({ n: count() }).from(schema.variants),
    db.select({ units: sql<number>`COALESCE(SUM(${schema.variants.stock}), 0)::int` }).from(schema.variants),
    db
      .select({
        value: sql<number>`COALESCE(SUM(${schema.variants.stock} * ${schema.products.priceUsd}), 0)::float`,
      })
      .from(schema.variants)
      .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId)),
    db.select({ n: count() }).from(schema.orders),
    db
      .select({ n: count() })
      .from(schema.orders)
      .where(gte(schema.orders.createdAt, startOfStoreDay())),
    db
      .select({
        value: sql<number>`COALESCE(SUM(${schema.orders.totalUsd}), 0)::float`,
      })
      .from(schema.orders)
      .where(gte(schema.orders.createdAt, startOfStoreDay())),
    db
      .select({
        id: schema.orders.id,
        email: schema.orders.email,
        totalUsd: schema.orders.totalUsd,
        status: schema.orders.status,
        createdAt: schema.orders.createdAt,
      })
      .from(schema.orders)
      .orderBy(sql`${schema.orders.createdAt} DESC`)
      .limit(5),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Live data from your Postgres backend.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Active products" value={String(productsActive[0].n)} sub={`of ${productsAll[0].n} total`} />
        <StatCard label="Variants (SKUs)" value={String(variantsRow[0].n)} />
        <StatCard label="Units in stock" value={Number(inStockUnitsRow[0].units).toLocaleString()} />
        <StatCard
          label="Retail value"
          value={`$${Math.round(Number(retailValueRow[0].value)).toLocaleString()}`}
          sub="sum of price × stock"
        />
        <StatCard label="Orders today" value={String(ordersTodayCount[0].n)} sub="Singapore time" />
        <StatCard
          label="Revenue today"
          value={`$${Math.round(Number(revenueTodayRow[0].value)).toLocaleString()}`}
          sub="Singapore time"
        />
        <StatCard label="Orders all time" value={String(ordersTotal[0].n)} />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs text-[var(--muted)] hover:text-[var(--accent)]">
            View all →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
            No orders yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--background)] text-left font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <RecentOrderRows
                  rows={recentOrders.map((o) => ({
                    id: o.id,
                    when: `${o.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Singapore" })} SGT`,
                    email: o.email,
                    total: `$${Number(o.totalUsd).toFixed(2)}`,
                    status: o.status,
                  }))}
                />
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/admin/import"
            title="Import a new stock lot"
            description="Upload spreadsheet + image zip; products and inventory get added or updated automatically."
          />
          <ActionCard
            href="/admin/products"
            title="Edit a product"
            description="Search the catalogue, change prices, toggle active/inactive, adjust stock."
          />
          <ActionCard
            href="/admin/orders"
            title="Fulfil orders"
            description="See unshipped paid orders and mark them as shipped."
          />
        </div>
      </section>
    </div>
  );
}

// Start of "today" in the store's business timezone (Singapore, UTC+8, no DST),
// returned as the equivalent UTC instant for the query. Using UTC midnight
// would miscount around the day boundary for admins in other timezones.
function startOfStoreDay(): Date {
  const OFFSET_MIN = 8 * 60; // Singapore is UTC+8 year-round
  const nowSgt = new Date(Date.now() + OFFSET_MIN * 60_000);
  const midnightSgtAsUtc = Date.UTC(
    nowSgt.getUTCFullYear(),
    nowSgt.getUTCMonth(),
    nowSgt.getUTCDate()
  );
  return new Date(midnightSgtAsUtc - OFFSET_MIN * 60_000);
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]"
    >
      <div className="font-bold">{title}</div>
      <div className="mt-1 text-sm text-[var(--muted)]">{description}</div>
    </Link>
  );
}
