import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brandstoxx.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/transactional and API surfaces out of the index.
        disallow: [
          "/admin",
          "/api",
          "/account",
          "/cart",
          "/checkout",
          "/login",
          "/signup",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
