import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isValidEmail, normalizeEmail } from "@/lib/customer-auth";
import { sendEmail } from "@/lib/email";
import { getBranding } from "@/lib/settings";

export const runtime = "nodejs";

// Sends a test email using the currently SAVED email settings so an admin can
// confirm delivery (e.g. after entering the Gmail App Password). Save first.
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { to?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const to = normalizeEmail(typeof body.to === "string" ? body.to : "");
  if (!isValidEmail(to)) {
    return NextResponse.json({ error: "Enter a valid recipient email." }, { status: 400 });
  }

  const { siteName } = await getBranding();
  const result = await sendEmail({
    to,
    subject: `Test email — ${siteName}`,
    html: `<p>This is a test from <strong>${siteName}</strong>. If you're reading this, your email settings work. ✅</p>`,
    text: `This is a test from ${siteName}. If you're reading this, your email settings work.`,
  });

  return NextResponse.json({
    ok: true,
    delivered: result.delivered,
    provider: result.provider,
    note: result.note,
  });
}
