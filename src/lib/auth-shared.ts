import "server-only";

/** Absolute site origin for building email links (no trailing slash). */
export function siteOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  try {
    return new URL(req.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}
