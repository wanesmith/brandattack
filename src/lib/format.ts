// Pure formatters — safe to import from client components.
// Keep zero runtime deps so postgres / drizzle don't get bundled into the browser.

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function discountPercent(p: { rrpUsd: number; priceUsd: number }): number {
  if (!p.rrpUsd || p.rrpUsd <= 0) return 0;
  return Math.round(((p.rrpUsd - p.priceUsd) / p.rrpUsd) * 100);
}
