import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { parseSavedAddress } from "@/lib/address";
import { formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function CustomerDetail({ params }: { params: Params }) {
  const { id } = await params;

  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  const user = rows[0];
  if (!user) notFound();

  const orders = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.email, user.email))
    .orderBy(desc(schema.orders.createdAt));

  const orderIds = orders.map((o) => o.id);
  const items = orderIds.length
    ? await db
        .select()
        .from(schema.orderItems)
        .where(inArray(schema.orderItems.orderId, orderIds))
    : [];
  const itemsByOrder = new Map<string, typeof items>();
  for (const it of items) {
    const arr = itemsByOrder.get(it.orderId) ?? [];
    arr.push(it);
    itemsByOrder.set(it.orderId, arr);
  }

  const address = parseSavedAddress(user.shippingAddress);
  const totalSpent = orders
    .filter((o) => o.status === "paid" || o.status === "shipped")
    .reduce((n, o) => n + Number(o.totalUsd), 0);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/users" className="text-xs text-[var(--muted)] hover:text-[var(--accent)]">
        ← Back to customers
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
        <span className="font-mono text-xs text-[var(--muted)]">
          joined {user.createdAt.toLocaleDateString()}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Email" value={user.email} mono />
        <Stat label="Status" value={user.emailVerified ? "Verified" : "Unverified"} />
        <Stat label="Orders / spend" value={`${orders.length} · ${formatUsd(totalSpent)}`} />
      </div>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
          Saved delivery address
        </h2>
        {address ? (
          <address className="text-sm not-italic leading-relaxed">
            {address.name && <div>{address.name}</div>}
            <div>{address.line1}</div>
            {address.line2 && <div>{address.line2}</div>}
            <div>{[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}</div>
            <div>{address.country}</div>
          </address>
        ) : (
          <p className="text-sm text-[var(--muted)]">None saved.</p>
        )}
      </section>

      <h2 className="mt-8 text-lg font-bold">Order history</h2>
      {orders.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">No orders yet.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {orders.map((o) => {
            const its = itemsByOrder.get(o.id) ?? [];
            return (
              <div key={o.id} className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--background)] px-4 py-2.5">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-mono text-xs hover:text-[var(--accent)] hover:underline"
                  >
                    #{o.id.slice(0, 8)} · {o.createdAt.toLocaleDateString()}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      {o.status}
                    </span>
                    {o.fulfilledAt && (
                      <span className="rounded-sm bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                        ✓ Fulfilled
                      </span>
                    )}
                    <span className="text-sm font-semibold">{formatUsd(Number(o.totalUsd))}</span>
                  </div>
                </div>
                {its.length > 0 ? (
                  <ul className="divide-y divide-[var(--border)]">
                    {its.map((it) => (
                      <li key={it.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span>
                          <span className="text-[var(--muted)]">{it.qty}×</span> {it.productTitle}
                          <span className="text-[var(--muted)]"> · {it.sizeLabel}</span>
                        </span>
                        <span className="text-[var(--muted)]">
                          {formatUsd(Number(it.unitPriceUsd) * it.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-2 text-sm text-[var(--muted)]">No item details recorded.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</div>
      <div className={"mt-1 text-sm font-medium " + (mono ? "font-mono break-all" : "")}>{value}</div>
    </div>
  );
}
