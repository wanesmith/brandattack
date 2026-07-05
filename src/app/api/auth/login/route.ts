import { NextResponse } from "next/server";
import {
  createSession,
  getUserByEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  const user = email ? await getUserByEmail(email) : null;
  const ok = user ? verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    // Soft delay to slow credential stuffing; generic message (no enumeration).
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, emailVerified: user.emailVerified });
}
