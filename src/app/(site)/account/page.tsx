import { redirect } from "next/navigation";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/customer-auth";
import { parseSavedAddress } from "@/lib/address";
import { getT } from "@/lib/i18n/server";
import { ResendVerification, LogoutButton } from "./AccountActions";
import { AddressForm } from "./AddressForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account — Brand Stoxx" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const t = await getT();

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
        <h1 className="font-display text-4xl">{t("header.account")}</h1>
        <LogoutButton />
      </div>

      {!user.emailVerified && (
        <div className="mt-6 rounded-sm border border-accent/40 bg-accent/10 px-4 py-4">
          <p className="text-sm font-medium text-ink">{t("account.verifyPrompt")}</p>
          <p className="mt-1 text-sm text-ink/60">
            {t("account.sentLinkPre")}<strong>{user.email}</strong>{t("account.sentLinkPost")}
          </p>
          <ResendVerification />
        </div>
      )}

      <dl className="mt-8 divide-y divide-rule border-y border-rule text-sm">
        <div className="flex justify-between py-3">
          <dt className="text-ink/60">{t("account.name")}</dt>
          <dd>{user.name || "—"}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-ink/60">{t("account.email")}</dt>
          <dd>{user.email}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-ink/60">{t("account.status")}</dt>
          <dd>
            {user.emailVerified ? (
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-600">
                {t("account.verified")}
              </span>
            ) : (
              <span className="font-mono text-xs uppercase tracking-wider text-amber-600">
                {t("account.unverified")}
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-12 flex items-baseline justify-between">
        <h2 className="font-display text-2xl">{t("account.deliveryAddress")}</h2>
        {savedAddress && (
          <span className="font-mono text-xs uppercase tracking-wider text-ink/50">{t("account.onFile")}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink/60">
        {t("account.deliveryAddressNote")}
      </p>
      <AddressForm initial={savedAddress} canImport={canImport} />

      <h2 className="mt-12 font-display text-2xl">{t("account.orderHistory")}</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">{t("account.noOrders")}</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-sm border border-rule">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left label-mono-sm text-ink/60">
              <tr>
                <th className="px-4 py-3">{t("account.date")}</th>
                <th className="px-4 py-3">{t("cart.total")}</th>
                <th className="px-4 py-3">{t("account.status")}</th>
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
