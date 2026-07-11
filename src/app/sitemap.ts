import type { MetadataRoute } from "next";
import { getAllProductSlugs } from "@/lib/products";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brandstoxx.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/shipping`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  let products: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getAllProductSlugs();
    products = slugs.map((slug) => ({
      url: `${base}/p/${slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    // If the DB is unavailable at request time, still return the static map.
  }

  return [...staticEntries, ...products];
}
