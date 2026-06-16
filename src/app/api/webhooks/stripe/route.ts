import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db, schema } from "@/db";
import { requireStripe } from "@/lib/stripe";

// Stripe sends raw body + signature header; Next.js gives us text via req.text().
// Don't parse JSON before verification.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  if (!whSecret)
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );

  const stripe = requireStripe();
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        await handleExpired(event.data.object as Stripe.Checkout.Session);
        break;
      // Add more handlers (refunds, disputes) when needed.
      default:
        // No-op — Stripe sends a lot of event types.
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCompleted(session: Stripe.Checkout.Session) {
  const stripe = requireStripe();

  // Idempotency: if we already wrote this order, exit.
  const existing = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(eq(schema.orders.stripeSessionId, session.id))
    .limit(1);
  if (existing.length > 0) return;

  // Re-fetch with line_items expanded to be safe.
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price.product", "customer_details"],
  });

  // Pull the cart we stashed in metadata at session-create time.
  let cart: { sku: string; qty: number }[] = [];
  try {
    cart = JSON.parse(full.metadata?.cart ?? "[]");
  } catch {
    cart = [];
  }

  const email =
    full.customer_details?.email ?? full.customer_email ?? "unknown@no-email.invalid";
  const subtotalUsd = ((full.amount_subtotal ?? full.amount_total ?? 0) / 100).toFixed(2);
  const totalUsd = ((full.amount_total ?? 0) / 100).toFixed(2);
  const shippingUsd = ((full.shipping_cost?.amount_total ?? 0) / 100).toFixed(2);
  const taxUsd = ((full.total_details?.amount_tax ?? 0) / 100).toFixed(2);
  const paymentIntentId =
    typeof full.payment_intent === "string" ? full.payment_intent : full.payment_intent?.id ?? null;

  // Shipping address shape moved between Stripe API versions
  // (top-level `shipping_details` → `collected_information.shipping_details`).
  // Read defensively rather than coupling to one version's TypeScript surface.
  const sessionAny = full as unknown as {
    shipping_details?: unknown;
    collected_information?: { shipping_details?: unknown };
  };
  const shippingAddr =
    sessionAny.shipping_details ?? sessionAny.collected_information?.shipping_details ?? null;
  const address = shippingAddr
    ? JSON.stringify(shippingAddr)
    : full.customer_details?.address
      ? JSON.stringify(full.customer_details.address)
      : null;

  await db.transaction(async (tx) => {
    // 1. Create order
    const [order] = await tx
      .insert(schema.orders)
      .values({
        email,
        stripeSessionId: full.id,
        stripePaymentIntentId: paymentIntentId,
        status: "paid",
        subtotalUsd,
        shippingUsd,
        taxUsd,
        totalUsd,
        shippingAddress: address,
      })
      .returning({ id: schema.orders.id });

    // 2. Order items — prefer the cart metadata we stashed (links us to our SKUs)
    if (cart.length > 0) {
      // Pull variant + product snapshots so item rows are self-contained
      const skuList = cart.map((c) => c.sku);
      const variantRows = await tx
        .select({
          sku: schema.variants.sku,
          sizeLabel: schema.variants.sizeLabel,
          productTitle: schema.products.title,
          priceUsd: schema.products.priceUsd,
        })
        .from(schema.variants)
        .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
        .where(sql`${schema.variants.sku} = ANY(${skuList})`);

      const byKsu = new Map(variantRows.map((v) => [v.sku, v]));
      for (const c of cart) {
        const v = byKsu.get(c.sku);
        if (!v) continue;
        await tx.insert(schema.orderItems).values({
          orderId: order.id,
          sku: c.sku,
          productTitle: v.productTitle,
          sizeLabel: v.sizeLabel,
          qty: c.qty,
          unitPriceUsd: v.priceUsd,
        });
      }
    }

    // 3. Decrement stock + release reservations for this session
    for (const c of cart) {
      await tx
        .update(schema.variants)
        .set({
          stock: sql`GREATEST(${schema.variants.stock} - ${c.qty}, 0)`,
          reserved: sql`GREATEST(${schema.variants.reserved} - ${c.qty}, 0)`,
        })
        .where(eq(schema.variants.sku, c.sku));
    }
    await tx.delete(schema.reservations).where(eq(schema.reservations.stripeSessionId, full.id));
  });

  console.log(`[stripe webhook] order created for session ${full.id}`);
}

async function handleExpired(session: Stripe.Checkout.Session) {
  // Release any reservations tied to an expired session
  await db.transaction(async (tx) => {
    const releases = await tx
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.stripeSessionId, session.id));
    for (const r of releases) {
      await tx
        .update(schema.variants)
        .set({ reserved: sql`GREATEST(${schema.variants.reserved} - ${r.qty}, 0)` })
        .where(eq(schema.variants.sku, r.sku));
    }
    await tx
      .delete(schema.reservations)
      .where(eq(schema.reservations.stripeSessionId, session.id));
  });
  console.log(`[stripe webhook] released reservations for expired session ${session.id}`);
}
