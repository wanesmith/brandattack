import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CLEAR_SESSION_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  const store = await cookies();
  store.set(CLEAR_SESSION_COOKIE.name, CLEAR_SESSION_COOKIE.value, CLEAR_SESSION_COOKIE.options);
  return NextResponse.json({ ok: true });
}
