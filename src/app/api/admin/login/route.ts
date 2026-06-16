import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildSessionCookie, checkPassword } from "@/lib/admin-auth";

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.password || typeof body.password !== "string") {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured on the server" },
      { status: 500 }
    );
  }

  if (!checkPassword(body.password)) {
    // Soft delay to slow brute force from a single client
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const cookie = buildSessionCookie();
  const store = await cookies();
  store.set(cookie.name, cookie.value, cookie.options);

  return NextResponse.json({ ok: true });
}
