import "server-only";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, isNull, gt } from "drizzle-orm";
import { db, schema } from "@/db";

export const SESSION_COOKIE = "bs_session";
const SESSION_DAYS = 30;
const SCRYPT_KEYLEN = 64;

export type TokenType = "verify_email" | "password_reset";
const TOKEN_TTL_MS: Record<TokenType, number> = {
  verify_email: 24 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
};

// --- Passwords ---------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Basic RFC-ish email shape check (not exhaustive, just sane).
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Session secret ----------------------------------------------------------
// Auto-generated once and persisted in the settings table (not exposed in the
// admin UI). Avoids requiring manual env configuration.

let cachedSecret: string | null = null;

async function getSessionSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "auth_session_secret"))
    .limit(1);
  if (rows[0]?.value) {
    cachedSecret = rows[0].value;
    return cachedSecret;
  }
  const secret = randomBytes(32).toString("hex");
  await db
    .insert(schema.settings)
    .values({ key: "auth_session_secret", value: secret })
    .onConflictDoNothing();
  // Re-read in case another request won the race.
  const again = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "auth_session_secret"))
    .limit(1);
  cachedSecret = again[0]?.value ?? secret;
  return cachedSecret;
}

// --- Session cookies ---------------------------------------------------------

async function sign(payload: string): Promise<string> {
  const secret = await getSessionSecret();
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  const value = `${payload}.${await sign(payload)}`;
  const store = await cookies();
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function userIdFromCookie(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const lastDot = value.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  const [userId, issuedAtStr] = payload.split(".");
  if (!userId || !issuedAtStr) return null;
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_DAYS * 24 * 60 * 60 * 1000) return null;
  const expected = await sign(payload);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return userId;
}

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: Date;
};

function toSafeUser(u: schema.User): SafeUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
  };
}

/** Current logged-in user (from the session cookie), or null. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const userId = await userIdFromCookie(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const u = rows[0];
  return u ? toSafeUser(u) : null;
}

// --- Users -------------------------------------------------------------------

export async function getUserByEmail(email: string): Promise<schema.User | null> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizeEmail(email)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<schema.User> {
  const [user] = await db
    .insert(schema.users)
    .values({
      email: normalizeEmail(input.email),
      passwordHash: hashPassword(input.password),
      name: input.name?.trim() || null,
    })
    .returning();
  return user;
}

export async function setPassword(userId: string, password: string): Promise<void> {
  await db
    .update(schema.users)
    .set({ passwordHash: hashPassword(password), updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
}

export async function markEmailVerified(userId: string): Promise<void> {
  await db
    .update(schema.users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
}

// --- Single-use tokens (verify email / password reset) -----------------------

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Issue a token of the given type for a user. Invalidates any prior unused
 * tokens of the same type, then returns the raw token to embed in a link.
 */
export async function issueToken(userId: string, type: TokenType): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS[type]);
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.authTokens)
      .where(and(eq(schema.authTokens.userId, userId), eq(schema.authTokens.type, type)));
    await tx.insert(schema.authTokens).values({ userId, type, tokenHash, expiresAt });
  });
  return raw;
}

/**
 * Validate + consume a token. Returns the userId on success, else null.
 * A token is valid if it exists, matches the type, is unused, and unexpired.
 */
export async function consumeToken(raw: string, type: TokenType): Promise<string | null> {
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const rows = await db
    .select()
    .from(schema.authTokens)
    .where(
      and(
        eq(schema.authTokens.tokenHash, tokenHash),
        eq(schema.authTokens.type, type),
        isNull(schema.authTokens.usedAt),
        gt(schema.authTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  const token = rows[0];
  if (!token) return null;
  await db
    .update(schema.authTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.authTokens.id, token.id));
  return token.userId;
}
