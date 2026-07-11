import { NextResponse } from "next/server";
import {
  createSession,
  createUser,
  getUserByEmail,
  isValidEmail,
  issueToken,
  normalizeEmail,
} from "@/lib/customer-auth";
import { sendEmail, verificationEmail } from "@/lib/email";
import { getBranding, getStoreControls } from "@/lib/settings";
import { siteOrigin } from "@/lib/auth-shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { signupsEnabled } = await getStoreControls();
  if (!signupsEnabled) {
    return NextResponse.json(
      { error: "New account registration is currently closed.", code: "signups_disabled" },
      { status: 403 }
    );
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const name = typeof body.name === "string" ? body.name : undefined;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in." },
      { status: 409 }
    );
  }

  const user = await createUser({ email, password, name });

  // Send verification email (best-effort; never blocks signup).
  try {
    const token = await issueToken(user.id, "verify_email");
    const { siteName } = await getBranding();
    const link = `${siteOrigin(req)}/verify-email?token=${token}`;
    await sendEmail({ to: user.email, ...verificationEmail(siteName, link) });
  } catch (err) {
    console.error("[signup] verification email failed:", err);
  }

  // Log the user in immediately; checkout stays blocked until they verify.
  await createSession(user.id);

  return NextResponse.json({ ok: true, emailVerified: false });
}
