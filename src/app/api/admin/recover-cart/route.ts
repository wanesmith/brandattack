import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";
import { cartRecoveryEmail, sendEmail } from "@/lib/email";
import { getBranding } from "@/lib/settings";
import { siteOrigin } from "@/lib/auth-shared";

export const runtime = "nodejs";

// Admin action: email a customer a link back to their abandoned cart.
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { cartId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const cartId = typeof body.cartId === "string" ? body.cartId.trim() : "";
  if (!cartId) return NextResponse.json({ error: "cartId required" }, { status: 400 });

  const rows = await db
    .select()
    .from(schema.carts)
    .where(eq(schema.carts.id, cartId))
    .limit(1);
  const cart = rows[0];
  if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });
  if (!cart.email) {
    return NextResponse.json(
      { error: "This cart has no email (guest checkout)." },
      { status: 400 }
    );
  }
  if (cart.itemCount <= 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  const { siteName } = await getBranding();
  const link = `${siteOrigin(req)}/cart?recover=${encodeURIComponent(cart.id)}`;

  let result;
  try {
    result = await sendEmail({ to: cart.email, ...cartRecoveryEmail(siteName, link) });
  } catch (err) {
    console.error("[/api/admin/recover-cart] send failed:", err);
    return NextResponse.json({ error: "Could not send email." }, { status: 500 });
  }

  await db
    .update(schema.carts)
    .set({ recoverySentAt: new Date() })
    .where(eq(schema.carts.id, cart.id));

  return NextResponse.json({
    ok: true,
    delivered: result.delivered,
    provider: result.provider,
  });
}
