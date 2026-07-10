import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/customer-auth";

export const runtime = "nodejs";

type IncomingItem = {
  sku?: unknown;
  productId?: unknown;
  productSlug?: unknown;
  title?: unknown;
  sizeLabel?: unknown;
  priceUsd?: unknown;
  imageUrl?: unknown;
  qty?: unknown;
  maxStock?: unknown;
};
type Body = { cartId?: unknown; items?: unknown };

// Client cart-store sync. Upserts a server-side snapshot of the shopper's cart
// keyed by a client-generated cart id, so the admin "Abandoned carts" view has
// something to read. Best-effort + non-authoritative — never blocks the UI.
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cartId = typeof body.cartId === "string" ? body.cartId.trim() : "";
  if (!cartId || cartId.length > 64) {
    return NextResponse.json({ error: "Invalid cartId" }, { status: 400 });
  }

  const raw: IncomingItem[] = Array.isArray(body.items) ? body.items : [];
  const items = raw
    .filter(
      (i) =>
        i &&
        typeof i.sku === "string" &&
        Number.isFinite(Number(i.qty)) &&
        Number(i.qty) > 0
    )
    .slice(0, 100)
    .map((i) => ({
      sku: String(i.sku).slice(0, 64),
      productId: String(i.productId ?? "").slice(0, 64),
      productSlug: String(i.productSlug ?? "").slice(0, 128),
      title: String(i.title ?? "").slice(0, 200),
      sizeLabel: String(i.sizeLabel ?? "").slice(0, 32),
      priceUsd: Number.isFinite(Number(i.priceUsd)) ? Number(i.priceUsd) : 0,
      imageUrl: String(i.imageUrl ?? "").slice(0, 512),
      qty: Math.min(Math.floor(Number(i.qty)), 9999),
      maxStock: Number.isFinite(Number(i.maxStock)) ? Math.floor(Number(i.maxStock)) : 0,
    }));

  const itemCount = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.qty * i.priceUsd, 0);

  // Attach the customer if signed in (gives the admin an email to see).
  const user = await getCurrentUser();

  const values = {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    items: JSON.stringify(items),
    itemCount,
    subtotalUsd: subtotal.toFixed(2),
    updatedAt: new Date(),
  };

  try {
    await db
      .insert(schema.carts)
      .values({ id: cartId, ...values })
      .onConflictDoUpdate({ target: schema.carts.id, set: values });
  } catch (err) {
    console.error("[/api/cart] upsert failed:", err);
    return NextResponse.json({ error: "Could not save cart" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Restore a cart snapshot by id — used by the recovery link (/cart?recover=…).
// The cart id is an unguessable client-generated token, so returning its own
// contents to whoever holds the link is acceptable.
export async function GET(req: Request) {
  const cartId = new URL(req.url).searchParams.get("cartId")?.trim() ?? "";
  if (!cartId || cartId.length > 64) {
    return NextResponse.json({ error: "Invalid cartId" }, { status: 400 });
  }
  const rows = await db
    .select({ items: schema.carts.items })
    .from(schema.carts)
    .where(eq(schema.carts.id, cartId))
    .limit(1);
  let items: unknown = [];
  if (rows[0]) {
    try {
      items = JSON.parse(rows[0].items);
    } catch {
      items = [];
    }
  }
  return NextResponse.json({ items: Array.isArray(items) ? items : [] });
}
