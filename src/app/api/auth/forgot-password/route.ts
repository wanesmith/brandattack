import { NextResponse } from "next/server";
import { getUserByEmail, issueToken, normalizeEmail } from "@/lib/customer-auth";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { getBranding } from "@/lib/settings";
import { siteOrigin } from "@/lib/auth-shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const user = email ? await getUserByEmail(email) : null;

  // Always return generic success — never reveal whether an account exists.
  if (user) {
    try {
      const token = await issueToken(user.id, "password_reset");
      const { siteName } = await getBranding();
      const link = `${siteOrigin(req)}/reset-password?token=${token}`;
      await sendEmail({ to: user.email, ...passwordResetEmail(siteName, link) });
    } catch (err) {
      console.error("[forgot-password] email failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
