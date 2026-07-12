// Site settings — key/value store backing the admin Settings page.
// Covers branding (name, wordmark, tagline, announcements, support email) and
// API credentials (Stripe). Used by server components, API routes, and the
// Stripe lib. Don't `import "server-only"` here — keeps it usable from scripts.
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type SettingType =
  | "text"
  | "textarea"
  | "email"
  | "secret"
  | "select"
  | "number"
  | "image"
  | "images";
export type SettingGroup =
  | "Site"
  | "Branding"
  | "Homepage hero"
  | "Payments (Stripe)"
  | "Email";

export type SettingDef = {
  key: string;
  group: SettingGroup;
  label: string;
  type: SettingType;
  default: string;
  placeholder?: string;
  help?: string;
  /** For secrets: the env var used as a fallback when the DB value is empty. */
  envFallback?: string;
  /** For select fields. */
  options?: { value: string; label: string }[];
};

export const SETTING_DEFS: SettingDef[] = [
  {
    key: "maintenance_mode",
    group: "Site",
    label: "Maintenance mode",
    type: "select",
    default: "false",
    options: [
      { value: "false", label: "Off — storefront is live" },
      { value: "true", label: "On — show maintenance page to visitors" },
    ],
    help: "When on, visitors see a maintenance page. The admin console stays open, and signed-in admins can still preview the storefront.",
  },
  {
    key: "maintenance_message",
    group: "Site",
    label: "Maintenance message",
    type: "textarea",
    default:
      "We're making some improvements and will be back very shortly. Thanks for your patience.",
    help: "Shown on the maintenance page.",
  },
  {
    key: "maintenance_bypass_code",
    group: "Site",
    label: "Maintenance bypass code",
    type: "text",
    default: "",
    placeholder: "e.g. sneak-peek-2026",
    help: "Share a link like https://www.brandstoxx.com/?bypass=THE_CODE — visitors with the matching code skip the maintenance page for their session. Leave blank to disable bypass.",
  },
  {
    key: "signups_enabled",
    group: "Site",
    label: "Customer signups",
    type: "select",
    default: "true",
    options: [
      { value: "true", label: "On — customers can create accounts" },
      { value: "false", label: "Off — new signups are closed" },
    ],
    help: "When off, new account registration is disabled. The storefront stays live and existing customers can still sign in.",
  },
  {
    key: "checkout_enabled",
    group: "Site",
    label: "Checkout / ordering",
    type: "select",
    default: "true",
    options: [
      { value: "true", label: "On — customers can place orders" },
      { value: "false", label: "Off — browse-only, no new orders" },
    ],
    help: "When off, checkout is disabled (browse-only). The storefront stays live; customers just can't complete a purchase.",
  },
  {
    key: "site_name",
    group: "Branding",
    label: "Site name",
    type: "text",
    default: "Brand Stoxx",
    help: "Used in page titles, the footer, and social share cards.",
  },
  {
    key: "wordmark_lead",
    group: "Branding",
    label: "Wordmark — lead",
    type: "text",
    default: "BRAND",
    help: "Bold first part of the header logo.",
  },
  {
    key: "wordmark_accent",
    group: "Branding",
    label: "Wordmark — accent",
    type: "text",
    default: "stoxx.",
    help: "Italic, coloured accent part of the header logo.",
  },
  {
    key: "tagline",
    group: "Branding",
    label: "Tagline / meta description",
    type: "textarea",
    default:
      "Authentic Adidas at end-of-line prices. 21,000+ units sourced direct from regional wholesalers. Shipped across Asia.",
    help: "Homepage description and SEO / social share text.",
  },
  {
    key: "announcements",
    group: "Branding",
    label: "Announcement bar",
    type: "textarea",
    default: [
      "Free shipping across Asia over $150",
      "Authentic guarantee",
      "Up to 70% off RRP",
      "New lot inbound · Q3 2026",
      "21,082 units · 2,290 styles · sea-freighted from Singapore",
    ].join("\n"),
    help: "One message per line — shown scrolling in the top bar.",
  },
  {
    key: "support_email",
    group: "Branding",
    label: "Support email",
    type: "email",
    default: "",
    placeholder: "support@brand-stoxx.com",
    help: "Shown in the footer as a contact address.",
  },
  {
    key: "hero_images",
    group: "Homepage hero",
    label: "Hero images",
    type: "images",
    default: "",
    help: "Images for the rotating hero carousel. Upload one or more and drag ←/→ to reorder. Leave empty to auto-pick from the catalogue (category + product images).",
  },
  {
    key: "hero_eyebrow",
    group: "Homepage hero",
    label: "Eyebrow line",
    type: "text",
    default: "N. 01 · The Singapore Lot · 2026",
    help: "Small label above the headline.",
  },
  {
    key: "hero_heading",
    group: "Homepage hero",
    label: "Headline",
    type: "textarea",
    default: "Authentic Adidas.\nOutlet prices.",
    help: "Main hero headline. Each line break becomes a new line.",
  },
  {
    key: "hero_cta_label",
    group: "Homepage hero",
    label: "Button label",
    type: "text",
    default: "Shop the lot",
  },
  {
    key: "hero_cta_href",
    group: "Homepage hero",
    label: "Button link",
    type: "text",
    default: "/shop",
    placeholder: "/shop",
  },
  {
    key: "stripe_publishable_key",
    group: "Payments (Stripe)",
    label: "Publishable key",
    type: "text",
    default: "",
    placeholder: "pk_test_… or pk_live_…",
    envFallback: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    help: "Safe to expose; used by the browser during checkout.",
  },
  {
    key: "stripe_secret_key",
    group: "Payments (Stripe)",
    label: "Secret key",
    type: "secret",
    default: "",
    placeholder: "sk_test_… or sk_live_…",
    envFallback: "STRIPE_SECRET_KEY",
    help: "Server-side key. Stored securely and never shown again after saving.",
  },
  {
    key: "stripe_webhook_secret",
    group: "Payments (Stripe)",
    label: "Webhook signing secret",
    type: "secret",
    default: "",
    placeholder: "whsec_…",
    envFallback: "STRIPE_WEBHOOK_SECRET",
    help: "From your Stripe webhook endpoint settings — verifies incoming events.",
  },
  {
    key: "email_provider",
    group: "Email",
    label: "Provider",
    type: "select",
    default: "",
    options: [
      { value: "", label: "Dev — log emails to server console" },
      { value: "resend", label: "Resend" },
      { value: "smtp", label: "SMTP" },
    ],
    help: "How verification / password-reset emails are sent. Dev mode just logs the link.",
  },
  {
    key: "email_from",
    group: "Email",
    label: "From address",
    type: "text",
    default: "",
    placeholder: "Brand Stoxx <no-reply@brand-stoxx.com>",
    help: "Sender shown on outgoing emails. Must be a domain you've verified with your provider.",
  },
  {
    key: "resend_api_key",
    group: "Email",
    label: "Resend API key",
    type: "secret",
    default: "",
    placeholder: "re_…",
    envFallback: "RESEND_API_KEY",
    help: "Used when the provider is Resend.",
  },
  {
    key: "smtp_host",
    group: "Email",
    label: "SMTP host",
    type: "text",
    default: "",
    placeholder: "smtp.example.com",
    help: "Used when the provider is SMTP.",
  },
  {
    key: "smtp_port",
    group: "Email",
    label: "SMTP port",
    type: "number",
    default: "587",
    placeholder: "587",
  },
  {
    key: "smtp_secure",
    group: "Email",
    label: "SMTP security",
    type: "select",
    default: "false",
    options: [
      { value: "false", label: "STARTTLS (usually port 587)" },
      { value: "true", label: "Implicit TLS (usually port 465)" },
    ],
  },
  {
    key: "smtp_user",
    group: "Email",
    label: "SMTP username",
    type: "text",
    default: "",
  },
  {
    key: "smtp_pass",
    group: "Email",
    label: "SMTP password",
    type: "secret",
    default: "",
    envFallback: "SMTP_PASS",
  },
];

const DEFAULTS: Record<string, string> = Object.fromEntries(
  SETTING_DEFS.map((d) => [d.key, d.default])
);
const DEF_BY_KEY = new Map(SETTING_DEFS.map((d) => [d.key, d]));
const SECRET_KEYS = new Set(
  SETTING_DEFS.filter((d) => d.type === "secret").map((d) => d.key)
);

/**
 * All settings merged over defaults. A row that exists overrides its default
 * (even if empty, so branding fields can be intentionally cleared). If the DB
 * is unreachable we degrade to defaults rather than crashing the site.
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const merged: Record<string, string> = { ...DEFAULTS };
  try {
    const rows = await db.select().from(schema.settings);
    for (const r of rows) {
      if (r.key in merged) merged[r.key] = r.value;
    }
  } catch (err) {
    console.warn("[settings] read failed, using defaults:", err);
  }
  return merged;
}

export async function getMaintenance(): Promise<{
  enabled: boolean;
  message: string;
  bypassCode: string;
}> {
  const s = await getAllSettings();
  return {
    enabled: s.maintenance_mode === "true",
    message: s.maintenance_message || DEFAULTS.maintenance_message,
    bypassCode: (s.maintenance_bypass_code || "").trim(),
  };
}

// Lighter switches than maintenance mode — the storefront stays browsable.
export async function getStoreControls(): Promise<{
  signupsEnabled: boolean;
  checkoutEnabled: boolean;
}> {
  const s = await getAllSettings();
  return {
    signupsEnabled: s.signups_enabled !== "false",
    checkoutEnabled: s.checkout_enabled !== "false",
  };
}

export type Branding = {
  siteName: string;
  wordmarkLead: string;
  wordmarkAccent: string;
  tagline: string;
  announcements: string[];
  supportEmail: string;
  hero: {
    images: string[];
    eyebrow: string;
    heading: string;
    ctaLabel: string;
    ctaHref: string;
  };
};

/** Parse a JSON array of image URLs (tolerates a bare single-URL string). */
function parseImageList(json: string | undefined): string[] {
  if (!json || !json.trim()) return [];
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr.filter((u) => typeof u === "string" && u.trim());
  } catch {
    return [json.trim()];
  }
  return [];
}

export async function getBranding(): Promise<Branding> {
  const s = await getAllSettings();
  return {
    siteName: s.site_name || DEFAULTS.site_name,
    wordmarkLead: s.wordmark_lead || DEFAULTS.wordmark_lead,
    wordmarkAccent: s.wordmark_accent || DEFAULTS.wordmark_accent,
    tagline: s.tagline,
    announcements: s.announcements
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    supportEmail: s.support_email.trim(),
    hero: {
      images: parseImageList(s.hero_images),
      eyebrow: s.hero_eyebrow,
      heading: s.hero_heading,
      ctaLabel: s.hero_cta_label || DEFAULTS.hero_cta_label,
      ctaHref: s.hero_cta_href || DEFAULTS.hero_cta_href,
    },
  };
}

// --- Stripe credentials: DB value first, env var as fallback -----------------

async function stripeValue(key: string, envVar: string): Promise<string | undefined> {
  const s = await getAllSettings();
  const fromDb = s[key]?.trim();
  if (fromDb) return fromDb;
  const fromEnv = process.env[envVar]?.trim();
  return fromEnv || undefined;
}

export function getStripeSecretKey(): Promise<string | undefined> {
  return stripeValue("stripe_secret_key", "STRIPE_SECRET_KEY");
}

export function getStripeWebhookSecret(): Promise<string | undefined> {
  return stripeValue("stripe_webhook_secret", "STRIPE_WEBHOOK_SECRET");
}

export function getStripePublishableKey(): Promise<string | undefined> {
  return stripeValue("stripe_publishable_key", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

export type EmailConfig = {
  provider: "resend" | "smtp" | "";
  from: string;
  resendApiKey: string;
  smtp: { host: string; port: number; user: string; pass: string; secure: boolean };
};

export async function getEmailConfig(): Promise<EmailConfig> {
  const s = await getAllSettings();
  const provider = s.email_provider === "resend" || s.email_provider === "smtp" ? s.email_provider : "";
  return {
    provider,
    from: s.email_from.trim(),
    resendApiKey: (s.resend_api_key || process.env.RESEND_API_KEY || "").trim(),
    smtp: {
      host: s.smtp_host.trim(),
      port: Number(s.smtp_port) || 587,
      user: s.smtp_user.trim(),
      pass: (s.smtp_pass || process.env.SMTP_PASS || "").trim(),
      secure: s.smtp_secure === "true",
    },
  };
}

// --- Admin page helpers ------------------------------------------------------

function maskSecret(v: string): string {
  if (!v) return "";
  return v.length <= 8 ? "••••" : `••••${v.slice(-4)}`;
}

export type AdminSettingField = SettingDef & {
  /** Current value for non-secret fields; always "" for secrets. */
  value: string;
  /** Where a secret is currently configured. */
  source?: "database" | "env" | "unset";
  /** Masked hint for a secret configured in the DB. */
  masked?: string;
};

/**
 * Field descriptors + current values for the admin form. Secret values are
 * never sent to the client — only whether/where they're set, plus a masked tail.
 */
export async function getSettingsForAdmin(): Promise<AdminSettingField[]> {
  const s = await getAllSettings();
  return SETTING_DEFS.map((d) => {
    if (d.type === "secret") {
      const dbVal = s[d.key]?.trim() ?? "";
      const envVal = d.envFallback ? process.env[d.envFallback]?.trim() : undefined;
      const source: AdminSettingField["source"] = dbVal
        ? "database"
        : envVal
          ? "env"
          : "unset";
      return { ...d, value: "", source, masked: dbVal ? maskSecret(dbVal) : undefined };
    }
    return { ...d, value: s[d.key] ?? d.default };
  });
}

/**
 * Upsert submitted values. Unknown keys are ignored. Empty secret values are
 * skipped (blank means "keep the existing key"). Scalar values are trimmed.
 */
export async function saveSettings(values: Record<string, unknown>): Promise<void> {
  const entries: [string, string][] = [];
  for (const [key, raw] of Object.entries(values)) {
    const def = DEF_BY_KEY.get(key);
    if (!def) continue;
    let value = typeof raw === "string" ? raw : String(raw ?? "");
    // Preserve internal newlines for multi-line fields; trim only the ends.
    value = value.replace(/^\s+|\s+$/g, "");
    if (SECRET_KEYS.has(key) && value === "") continue; // keep existing secret
    entries.push([key, value]);
  }
  if (entries.length === 0) return;

  await db.transaction(async (tx) => {
    for (const [key, value] of entries) {
      await tx
        .insert(schema.settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value, updatedAt: sql`now()` },
        });
    }
  });
}
