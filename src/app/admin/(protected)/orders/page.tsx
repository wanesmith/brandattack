import { desc } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

export default async function OrdersAdmin() {
  const orders = await db
    .select()
    .from(schema.orders)
    .orderBy(desc(schema.orders.createdAt))
    .limit(100);

  return (
    <div>
      <h1 className="text-3xl font-bold">Orders</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Latest 100 orders. Fulfilment actions (mark shipped, add tracking, refund) coming in the next pass.
      </p>

      <div className="mt-6 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--background)] text-left font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 text-[var(--muted)]">{o.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{o.email}</td>
                  <td className="px-4 py-2">${Number(o.totalUsd).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
