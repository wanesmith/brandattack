import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { parseStripeAddress } from "@/lib/address";
import { formatUsd } from "@/lib/format";
import { OrderFulfillment } from "./OrderFulfillment";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function OrderDetail({ params }: { params: Params }) {
  const { id } = await params;

  const rows = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) notFound();

  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, id));

  const address = parseStripeAddress(order.shippingAddress);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/orders" className="text-xs text-[var(--muted)] hover:text-[var(--accent)]">
        ← Back to orders
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">Order {order.id.slice(0, 8)}</h1>
        <span className="font-mono text-xs text-[var(--muted)]">
          {order.createdAt.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
          {order.status}
        </span>
        {order.fulfilledAt ? (
          <span className="rounded-sm bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            ✓ Fulfilled {order.fulfilledAt.toLocaleDateString()}
          </span>
        ) : (
          <span className="rounded-sm bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
            Unfulfilled
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
            Customer
          </h2>
          <p className="font-mono text-sm">{order.email}</p>
        </section>
        <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
            Ship to
          </h2>
          {address ? (
            <address className="text-sm not-italic leading-relaxed">
              {address.name && <div>{address.name}</div>}
              <div>{address.line1}</div>
              {address.line2 && <div>{address.line2}</div>}
              <div>
                {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
              </div>
              <div>{address.country}</div>
              {address.phone && <div className="text-[var(--muted)]">{address.phone}</div>}
            </address>
          ) : (
            <p className="text-sm text-[var(--muted)]">No address on file.</p>
          )}
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--background)] text-left font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Line</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-2">
                  {it.productTitle}
                  <span className="ml-2 font-mono text-[10px] text-[var(--muted)]">{it.sku}</span>
                </td>
                <td className="px-4 py-2">{it.sizeLabel}</td>
                <td className="px-4 py-2">{it.qty}</td>
                <td className="px-4 py-2">{formatUsd(Number(it.unitPriceUsd))}</td>
                <td className="px-4 py-2">{formatUsd(Number(it.unitPriceUsd) * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-4 flex justify-end">
        <dl className="w-56 space-y-1 text-sm">
          <Row label="Subtotal" value={formatUsd(Number(order.subtotalUsd))} />
          <Row label="Shipping" value={formatUsd(Number(order.shippingUsd))} />
          <Row label="Tax" value={formatUsd(Number(order.taxUsd))} />
          <div className="flex justify-between border-t border-[var(--border)] pt-1 font-bold">
            <dt>Total</dt>
            <dd>{formatUsd(Number(order.totalUsd))}</dd>
          </div>
        </dl>
      </div>

      <OrderFulfillment
        id={order.id}
        status={order.status}
        statuses={[...schema.orderStatusEnum.enumValues]}
        trackingNumber={order.trackingNumber ?? ""}
        notes={order.notes ?? ""}
        fulfilled={Boolean(order.fulfilledAt)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[var(--muted)]">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
