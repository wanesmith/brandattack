import productsData from "@/data/products.json";

export type Variant = {
  size: string;
  sizeLabel: string;
  stock: number;
  sku: string;
};

export type Product = {
  id: string;
  articleNo: string;
  title: string;
  description: string;
  brand: string;
  division: "APPAREL" | "FOOTWEAR" | "HARDWARE";
  gender: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
  sportsCode: string;
  productGroup: string;
  productType: string;
  season: string;
  rrpUsd: number;
  priceUsd: number;
  totalStock: number;
  images: string[];
  variants: Variant[];
};

const products = productsData as Product[];

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.id === slug);
}

export type Filters = {
  division?: string;
  gender?: string;
  sportsCode?: string;
  q?: string;
};

export function filterProducts(filters: Filters): Product[] {
  const q = filters.q?.trim().toLowerCase();
  return products.filter((p) => {
    if (filters.division && p.division !== filters.division) return false;
    if (filters.gender && p.gender !== filters.gender) return false;
    if (filters.sportsCode && p.sportsCode !== filters.sportsCode) return false;
    if (q && !`${p.title} ${p.articleNo} ${p.productGroup}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function uniqueValues<K extends keyof Product>(key: K): string[] {
  const set = new Set<string>();
  for (const p of products) {
    const v = p[key];
    if (typeof v === "string" && v) set.add(v);
  }
  return [...set].sort();
}

export function discountPercent(p: Product): number {
  if (!p.rrpUsd || p.rrpUsd <= 0) return 0;
  return Math.round(((p.rrpUsd - p.priceUsd) / p.rrpUsd) * 100);
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
