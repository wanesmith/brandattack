import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Maintenance-mode bypass: when a request carries `?bypass=<code>`, stash the
// code in a session cookie and redirect to the clean URL. The storefront
// layout validates the cookie against the admin-configured bypass code (this
// runs on the edge, so no DB access here — capture only).
export const BYPASS_COOKIE = "mnt_bypass";

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  if (url.searchParams.has("bypass")) {
    const code = url.searchParams.get("bypass") ?? "";
    url.searchParams.delete("bypass");
    const res = NextResponse.redirect(url);
    res.cookies.set(BYPASS_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      // No maxAge → session cookie (cleared when the browser closes).
    });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  // Run on pages, skip static assets and API routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/).*)"],
};
