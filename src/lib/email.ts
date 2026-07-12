import "server-only";
import { getEmailConfig } from "@/lib/settings";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendResult = { delivered: boolean; provider: string; note?: string };

/**
 * Send a transactional email using the provider configured in admin Settings.
 * Falls back to logging the message to the server console (dev mode) when no
 * provider is configured or config is incomplete, so auth flows work locally.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const cfg = await getEmailConfig();
  const from = cfg.from || "Brand Stoxx <onboarding@resend.dev>";

  try {
    if (cfg.provider === "resend" && cfg.resendApiKey) {
      return await sendViaResend(cfg.resendApiKey, from, input);
    }
    if (cfg.provider === "smtp" && cfg.smtp.host) {
      return await sendViaSmtp(cfg.smtp, from, input);
    }
  } catch (err) {
    // Never let an email failure crash the calling flow — log and fall through
    // to the console so the developer can still complete the action.
    console.error("[email] send failed, falling back to console:", err);
    logToConsole(from, input, "delivery failed");
    return {
      delivered: false,
      provider: cfg.provider || "none",
      note: err instanceof Error ? err.message : "send failed",
    };
  }

  logToConsole(from, input, cfg.provider ? "provider not fully configured" : "dev mode");
  return { delivered: false, provider: "console", note: "logged to server console" };
}

async function sendViaResend(
  apiKey: string,
  from: string,
  input: SendEmailInput
): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend responded ${res.status}: ${body}`);
  }
  return { delivered: true, provider: "resend" };
}

async function sendViaSmtp(
  smtp: { host: string; port: number; user: string; pass: string; secure: boolean },
  from: string,
  input: SendEmailInput
): Promise<SendResult> {
  // Dynamic import so nodemailer is only loaded on the server when SMTP is used.
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  });
  return { delivered: true, provider: "smtp" };
}

// --- Templates ---------------------------------------------------------------

function layout(siteName: string, heading: string, body: string, cta: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <div style="font-weight:800;font-size:20px;letter-spacing:-0.02em;margin-bottom:24px">${escapeHtml(siteName)}</div>
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:28px">
      <h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(heading)}</h1>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 20px">${body}</p>
      <a href="${cta.url}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 20px;border-radius:6px">${escapeHtml(cta.label)}</a>
      <p style="font-size:12px;color:#71717a;margin:20px 0 0;word-break:break-all">Or paste this link:<br>${escapeHtml(cta.url)}</p>
    </div>
    <p style="font-size:12px;color:#a1a1aa;margin-top:20px">If you didn't request this, you can safely ignore this email.</p>
  </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

export function verificationEmail(siteName: string, link: string): Omit<SendEmailInput, "to"> {
  return {
    subject: `Verify your email — ${siteName}`,
    html: layout(
      siteName,
      "Confirm your email",
      "Tap the button below to verify your email address and activate your account.",
      { label: "Verify email", url: link }
    ),
    text: `Verify your email for ${siteName}:\n${link}\n\nThis link expires in 24 hours. If you didn't sign up, ignore this email.`,
  };
}

export function passwordResetEmail(siteName: string, link: string): Omit<SendEmailInput, "to"> {
  return {
    subject: `Reset your password — ${siteName}`,
    html: layout(
      siteName,
      "Reset your password",
      "We received a request to reset your password. Tap below to choose a new one. This link expires in 1 hour.",
      { label: "Reset password", url: link }
    ),
    text: `Reset your password for ${siteName}:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  };
}

export function cartRecoveryEmail(siteName: string, link: string): Omit<SendEmailInput, "to"> {
  return {
    subject: `You left something in your cart — ${siteName}`,
    html: layout(
      siteName,
      "Your cart is waiting",
      "You left items in your cart. Tap below to pick up right where you left off — before your sizes sell out.",
      { label: "Return to your cart", url: link }
    ),
    text: `You left items in your cart at ${siteName}.\nPick up where you left off:\n${link}`,
  };
}

function logToConsole(from: string, input: SendEmailInput, reason: string) {
  console.log(
    [
      "",
      "──────────────── EMAIL (" + reason + ") ────────────────",
      `From:    ${from}`,
      `To:      ${input.to}`,
      `Subject: ${input.subject}`,
      "",
      input.text,
      "───────────────────────────────────────────────────────",
      "",
    ].join("\n")
  );
}
