import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStripe } from "@/lib/stripe";

type Body = {
  items: { sku: string; qty: number }[];
};

const RESERVATION_MINUTES = 15;

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    console.error("[/api/checkout] unhandled error:", err);
    const message =
      err instanceof Error ? err.message : "Unexpected error starting checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handle(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Coalesce duplicate SKUs in the request (defensive) + validate shape
  const reqMap = new Map<string, number>();
  for (const it of body.items) {
    if (!it.sku || typeof it.sku !== "string") {
      return NextResponse.json({ error: "Invalid item: missing sku" }, { status: 400 });
    }
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty <= 0) {
      return NextResponse.json({ error: `Invalid qty for ${it.sku}` }, { status: 400 });
    }
    reqMap.set(it.sku, (reqMap.get(it.sku) ?? 0) + qty);
  }

  const skus = [...reqMap.keys()];

  // Pull variants + parent product info in one shot
  const rows = await db
    .select({
      sku: schema.variants.sku,
      stock: schema.variants.stock,
      reserved: schema.variants.reserved,
      sizeLabel: schema.variants.sizeLabel,
      productId: schema.variants.productId,
      productTitle: schema.products.title,
      priceUsd: schema.products.priceUsd,
      image: sql<string | null>`(
        SELECT url FROM ${schema.productImages}
        WHERE ${schema.productImages.productId} = ${schema.variants.productId}
        ORDER BY ${schema.productImages.position} ASC
        LIMIT 1
      )`,
    })
    .from(schema.variants)
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .where(
      and(
        inArray(schema.variants.sku, skus),
        eq(schema.products.active, true)
      )
    );

  if (rows.length !== skus.length) {
    const found = new Set(rows.map((r) => r.sku));
    const missing = skus.filter((s) => !found.has(s));
    return NextResponse.json(
      { error: `Some items are no longer available: ${missing.join(", ")}` },
      { status: 409 }
    );
  }

  // Stock check (available = stock - reserved)
  const errs: string[] = [];
  for (const r of rows) {
    const want = reqMap.get(r.sku)!;
    const avail = r.stock - r.reserved;
    if (want > avail) {
      errs.push(`${r.productTitle} (size ${r.sizeLabel}): only ${avail} left`);
    }
  }
  if (errs.length > 0) {
    return NextResponse.json({ error: errs.join("; ") }, { status: 409 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    req.headers.get("origin") ??
    "http://localhost:3000";

  const stripe = requireStripe();

  // Build Stripe line items
  const lineItems = rows.map((r) => {
    const qty = reqMap.get(r.sku)!;
    return {
      quantity: qty,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(r.priceUsd) * 100),
        product_data: {
          name: `${r.productTitle} — Size ${r.sizeLabel}`,
          metadata: { sku: r.sku, product_id: r.productId },
          ...(r.image ? { images: [absoluteImageUrl(r.image, origin)] } : {}),
        },
      },
    };
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    payment_method_types: ["card"],
    billing_address_collection: "required",
    shipping_address_collection: {
      // Asia-focused launch; extend as new markets come online.
      allowed_countries: ["SG", "MY", "TH", "ID", "VN", "PH", "HK", "TW", "JP", "KR"],
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    metadata: {
      cart: JSON.stringify([...reqMap.entries()].map(([sku, qty]) => ({ sku, qty }))),
    },
    expires_at: Math.floor(Date.now() / 1000) + 60 * 30, // 30 min Stripe session
  });

  // Persist a reservation per line item so concurrent shoppers can't oversell.
  // The webhook clears these on completion; expired ones get swept (TODO).
  const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
  await db.transaction(async (tx) => {
    for (const [sku, qty] of reqMap) {
      await tx.insert(schema.reservations).values({
        sku,
        qty,
        stripeSessionId: session.id,
        expiresAt,
      });
      await tx
        .update(schema.variants)
        .set({ reserved: sql`${schema.variants.reserved} + ${qty}` })
        .where(eq(schema.variants.sku, sku));
    }
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}

function absoluteImageUrl(url: string, origin: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return origin + (url.startsWith("/") ? url : `/${url}`);
}
