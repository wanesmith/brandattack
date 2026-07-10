import { and, desc, gt, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

// A cart counts as "abandoned" once it still holds items but hasn't been
// touched for this long. The client clears the cart on a completed checkout,
// which syncs an empty cart here and drops it out of this list.
const ABANDON_MINUTES = 30;

type CartItem = {
  sku: string;
  title: string;
  sizeLabel: string;
  qty: number;
  priceUsd: number;
};

function parseItems(raw: string): CartItem[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default async function AbandonedCartsAdmin() {
  const carts = await db
    .select()
    .from(schema.carts)
    .where(
      and(
        gt(schema.carts.itemCount, 0),
        lt(schema.carts.updatedAt, sql`now() - interval '30 minutes'`)
      )
    )
    .orderBy(desc(schema.carts.updatedAt))
    .limit(100);

  const totalValue = carts.reduce((n, c) => n + Number(c.subtotalUsd), 0);
  const totalUnits = carts.reduce((n, c) => n + c.itemCount, 0);

  return (
    <div>
      <h1 className="text-3xl font-bold">Abandoned carts</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Carts with items untouched for {ABANDON_MINUTES}+ minutes. Cleared automatically when a
        checkout completes.
      </p>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Abandoned carts" value={String(carts.length)} />
        <StatCard label="Units at risk" value={totalUnits.toLocaleString()} />
        <StatCard label="Value at risk" value={formatUsd(totalValue)} />
      </section>

      <div className="mt-8 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--background)] text-left font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {carts.map((c) => {
              const items = parseItems(c.items);
              return (
                <tr key={c.id} className="align-top hover:bg-[var(--background)]">
                  <td className="px-4 py-3">
                    {c.email ? (
                      <span className="font-mono text-xs">{c.email}</span>
                    ) : (
                      <span className="text-[var(--muted)]">Guest</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-0.5">
                      {items.map((it, idx) => (
                        <li key={`${c.id}-${it.sku}-${idx}`} className="text-[13px]">
                          <span className="text-[var(--muted)]">{it.qty}×</span> {it.title}
                          {it.sizeLabel ? (
                            <span className="text-[var(--muted)]"> · {it.sizeLabel}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">{c.itemCount}</td>
                  <td className="px-4 py-3">{formatUsd(Number(c.subtotalUsd))}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{c.updatedAt.toLocaleString()}</td>
                </tr>
              );
            })}
            {carts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                  No abandoned carts right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
