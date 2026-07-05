import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ClearCartOnMount } from "./ClearCartOnMount";

type SearchParams = Promise<{ session_id?: string }>;

export const metadata = {
  title: "Thanks for your order — Brand Stoxx",
  robots: { index: false },
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { session_id } = await searchParams;

  let orderRow = null;
  if (session_id) {
    const rows = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.stripeSessionId, session_id))
      .limit(1);
    orderRow = rows[0] ?? null;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <ClearCartOnMount />
      <div className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent)]">
        Order received
      </div>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Thanks — you&apos;re sorted.</h1>

      {orderRow ? (
        <div className="mt-8 rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 text-left">
          <Row label="Order ID" value={orderRow.id} mono />
          <Row label="Status" value={orderRow.status.toUpperCase()} />
          <Row label="Total" value={`$${Number(orderRow.totalUsd).toFixed(2)} USD`} />
          <Row label="Email" value={orderRow.email} />
          <p className="mt-4 text-xs text-[var(--muted)]">
            A confirmation email will land shortly. Tracking follows once Jack&apos;s shipped it.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-[var(--muted)]">
          Your payment cleared. We&apos;re still recording the order details — refresh in a few
          seconds, or check your email for confirmation.
        </p>
      )}

      <div className="mt-10 flex justify-center gap-3">
        <Link
          href="/shop"
          className="rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black hover:opacity-90"
        >
          Keep shopping →
        </Link>
        <Link
          href="/"
          className="rounded-sm border border-[var(--border)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider hover:border-[var(--accent)]"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-b-0">
      <span className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      <span className={mono ? "font-mono text-sm" : "text-sm"}>{value}</span>
    </div>
  );
}
