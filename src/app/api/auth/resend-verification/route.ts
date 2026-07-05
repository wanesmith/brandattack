import { NextResponse } from "next/server";
import { getCurrentUser, issueToken } from "@/lib/customer-auth";
import { sendEmail, verificationEmail } from "@/lib/email";
import { getBranding } from "@/lib/settings";
import { siteOrigin } from "@/lib/auth-shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  try {
    const token = await issueToken(user.id, "verify_email");
    const { siteName } = await getBranding();
    const link = `${siteOrigin(req)}/verify-email?token=${token}`;
    await sendEmail({ to: user.email, ...verificationEmail(siteName, link) });
  } catch (err) {
    console.error("[resend-verification] failed:", err);
    return NextResponse.json({ error: "Could not send email. Try again later." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
