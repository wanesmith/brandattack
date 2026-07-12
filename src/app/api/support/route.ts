import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/customer-auth";
import { sendEmail } from "@/lib/email";
import { getBranding } from "@/lib/settings";

export const runtime = "nodejs";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export async function POST(req: Request) {
  let body: { name?: unknown; email?: unknown; subject?: unknown; message?: unknown; company?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot — bots fill hidden fields; humans don't.
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ ok: true });
  }

  const name = (typeof body.name === "string" ? body.name : "").trim().slice(0, 120);
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const subject = (typeof body.subject === "string" ? body.subject : "").trim().slice(0, 160);
  const message = (typeof body.message === "string" ? body.message : "").trim().slice(0, 5000);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (message.length < 5) {
    return NextResponse.json({ error: "Please write a message." }, { status: 400 });
  }

  const { siteName, supportEmail } = await getBranding();
  const to = supportEmail || "support@brandstoxx.com";
  const subjectLine = `Support${subject ? `: ${subject}` : ""} — from ${name || email}`;

  const text = [
    `New support message via ${siteName}`,
    ``,
    `Name:    ${name || "—"}`,
    `Email:   ${email}`,
    `Subject: ${subject || "—"}`,
    ``,
    message,
  ].join("\n");

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#18181b;line-height:1.6">
    <p style="color:#71717a;margin:0 0 12px">New support message via ${escapeHtml(siteName)}</p>
    <p style="margin:0"><strong>Name:</strong> ${escapeHtml(name || "—")}</p>
    <p style="margin:0"><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p style="margin:0 0 12px"><strong>Subject:</strong> ${escapeHtml(subject || "—")}</p>
    <div style="white-space:pre-wrap;border-left:3px solid #e4e4e7;padding-left:12px">${escapeHtml(message)}</div>
  </div>`;

  try {
    await sendEmail({ to, subject: subjectLine, html, text, replyTo: email });
  } catch (err) {
    console.error("[/api/support] send failed:", err);
    return NextResponse.json({ error: "Could not send. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
