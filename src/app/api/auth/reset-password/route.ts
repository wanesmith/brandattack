import { NextResponse } from "next/server";
import { consumeToken, markEmailVerified, setPassword } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const token = body.token ?? "";
  const password = body.password ?? "";

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const userId = await consumeToken(token, "password_reset");
  if (!userId) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  await setPassword(userId, password);
  // A successful reset proves control of the inbox, so treat email as verified.
  await markEmailVerified(userId);

  return NextResponse.json({ ok: true });
}
