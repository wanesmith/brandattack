import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const STATUSES = schema.orderStatusEnum.enumValues;

type Body = {
  id?: unknown;
  status?: unknown;
  trackingNumber?: unknown;
  notes?: unknown;
  fulfilled?: unknown;
};

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Order id required" }, { status: 400 });

  const existing = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(eq(schema.orders.id, id))
    .limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const set: Partial<typeof schema.orders.$inferInsert> = { updatedAt: new Date() };
  if (
    typeof body.status === "string" &&
    (STATUSES as readonly string[]).includes(body.status)
  ) {
    set.status = body.status as (typeof STATUSES)[number];
  }
  if (typeof body.trackingNumber === "string") {
    set.trackingNumber = body.trackingNumber.trim() || null;
  }
  if (typeof body.notes === "string") {
    set.notes = body.notes;
  }
  if (typeof body.fulfilled === "boolean") {
    set.fulfilledAt = body.fulfilled ? new Date() : null;
  }

  await db.update(schema.orders).set(set).where(eq(schema.orders.id, id));
  return NextResponse.json({ ok: true });
}
