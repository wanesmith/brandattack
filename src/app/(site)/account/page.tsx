import { redirect } from "next/navigation";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/customer-auth";
import { parseSavedAddress } from "@/lib/address";
import { ResendVerification, LogoutButton } from "./AccountActions";
import { AddressForm } from "./AddressForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account — Brand Stoxx" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const orders = await db
    .select({
      id: schema.orders.id,
      totalUsd: schema.orders.totalUsd,
      status: schema.orders.status,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .where(eq(schema.orders.email, user.email))
    .orderBy(desc(schema.orders.createdAt))
    .limit(20);

  // Saved delivery address + whether there's a past order to import from.
  const [savedRow, importable] = await Promise.all([
    db
      .select({ shippingAddress: schema.users.shippingAddress })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1),
    db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(
        and(eq(schema.orders.email, user.email), isNotNull(schema.orders.shippingAddress))
      )
      .limit(1),
  ]);
  const savedAddress = parseSavedAddress(savedRow[0]?.shippingAddress ?? null);
  const canImport = importable.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 lg:py-24">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-4xl">Your account</h1>
        <LogoutButton />
      </div>

      {!user.emailVerified && (
        <div className="mt-6 rounded-sm border border-accent/40 bg-accent/10 px-4 py-4">
          <p className="text-sm font-medium text-ink">Verify your email to check out.</p>
          <p className="mt-1 text-sm text-ink/60">
            We sent a link to <strong>{user.email}</strong>. Didn&apos;t get it?
          </p>
          <ResendVerification />
        </div>
      )}

      <dl className="mt-8 divide-y divide-rule border-y border-rule text-sm">
        <div className="flex justify-between py-3">
          <dt className="text-ink/60">Name</dt>
          <dd>{user.name || "—"}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-ink/60">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-ink/60">Status</dt>
          <dd>
            {user.emailVerified ? (
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-600">
                Verified
              </span>
            ) : (
              <span className="font-mono text-xs uppercase tracking-wider text-amber-600">
                Unverified
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-12 flex items-baseline justify-between">
        <h2 className="font-display text-2xl">Delivery address</h2>
        {savedAddress && (
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">On file</span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Where your orders ship. Import it from your last order or enter it manually.
      </p>
      <AddressForm initial={savedAddress} canImport={canImport} />

      <h2 className="mt-12 font-display text-2xl">Order history</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">No orders yet.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-sm border border-rule">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left label-mono-sm text-ink/60">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 text-ink/70">{o.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-3">${Number(o.totalUsd).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider">
                    {o.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
