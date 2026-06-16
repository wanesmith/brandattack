import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "brandattack_admin";
const SESSION_DAYS = 7;

function getSecret(): string {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) throw new Error("ADMIN_PASSWORD is not set in .env.local");
  // Derive a session-signing key from the password + a fixed app salt.
  // Changing ADMIN_PASSWORD invalidates all existing sessions, which is the
  // behaviour we want.
  return createHmac("sha256", "brandattack-session-v1").update(pwd).digest("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function verifySig(payload: string, sig: string): boolean {
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function buildSessionCookie(): {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
} {
  const issuedAt = Date.now();
  const payload = String(issuedAt);
  const value = `${payload}.${sign(payload)}`;
  return {
    name: COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
    },
  };
}

export const CLEAR_SESSION_COOKIE = {
  name: COOKIE_NAME,
  value: "",
  options: { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 0 },
};

export function isValidSessionCookie(value: string | undefined): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const issuedAt = Number(payload);
  if (!Number.isFinite(issuedAt)) return false;
  // Expiry check (defence in depth — cookie maxAge handles it too)
  if (Date.now() - issuedAt > SESSION_DAYS * 24 * 60 * 60 * 1000) return false;
  try {
    return verifySig(payload, sig);
  } catch {
    return false;
  }
}

export function checkPassword(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (submitted.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(submitted), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;

/**
 * For API routes: returns null if request has a valid admin session,
 * otherwise returns a NextResponse with 401.
 */
export async function requireAdmin(): Promise<Response | null> {
  const { cookies } = await import("next/headers");
  const { NextResponse } = await import("next/server");
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!isValidSessionCookie(value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
