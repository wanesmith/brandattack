import { NextResponse } from "next/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/customer-auth";
import { normalizeAddress, parseStripeAddress } from "@/lib/address";

export const runtime = "nodejs";

// GET ?source=last-order → the Stripe-collected shipping address from the
// customer's most recent order (for the "Import from Stripe" button).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rows = await db
    .select({ shippingAddress: schema.orders.shippingAddress })
    .from(schema.orders)
    .where(
      and(eq(schema.orders.email, user.email), isNotNull(schema.orders.shippingAddress))
    )
    .orderBy(desc(schema.orders.createdAt))
    .limit(1);

  const address = parseStripeAddress(rows[0]?.shippingAddress ?? null);
  if (!address) {
    return NextResponse.json(
      { error: "No address found on a past order yet." },
      { status: 404 }
    );
  }
  return NextResponse.json({ address });
}

// POST → save the (manually edited or imported) address on the account.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const address = normalizeAddress(body);
  if (!address.line1 || !address.city || !address.country) {
    return NextResponse.json(
      { error: "Address line 1, city, and country are required." },
      { status: 400 }
    );
  }

  await db
    .update(schema.users)
    .set({ shippingAddress: JSON.stringify(address), updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  return NextResponse.json({ ok: true, address });
}
