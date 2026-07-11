import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n/server";
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
  const t = await getT();

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
        {t("checkout.orderReceived")}
      </div>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{t("checkout.thanksTitle")}</h1>

      {orderRow ? (
        <div className="mt-8 rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 text-left">
          <Row label={t("checkout.orderId")} value={orderRow.id} mono />
          <Row label={t("checkout.status")} value={orderRow.status.toUpperCase()} />
          <Row label={t("cart.total")} value={`$${Number(orderRow.totalUsd).toFixed(2)} USD`} />
          <Row label={t("checkout.email")} value={orderRow.email} />
          <p className="mt-4 text-xs text-[var(--muted)]">
            {t("checkout.confirmEmailNote")}
          </p>
        </div>
      ) : (
        <p className="mt-6 text-[var(--muted)]">
          {t("checkout.pendingNote")}
        </p>
      )}

      <div className="mt-10 flex justify-center gap-3">
        <Link
          href="/shop"
          className="rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black hover:opacity-90"
        >
          {t("checkout.keepShopping")} →
        </Link>
        <Link
          href="/"
          className="rounded-sm border border-[var(--border)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider hover:border-[var(--accent)]"
        >
          {t("checkout.home")}
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
