import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getAllProducts } from "@/lib/products";

export default function Home() {
  const all = getAllProducts();
  const featured = all
    .slice()
    .sort((a, b) => (b.rrpUsd - b.priceUsd) - (a.rrpUsd - a.priceUsd))
    .slice(0, 8);

  return (
    <div>
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:py-28">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent)]">
            Branded closeouts · shipped across Asia
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
            Brand names.<br />
            Wholesale prices.<br />
            <span className="text-[var(--accent)]">No middlemen.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-[var(--muted)] sm:text-lg">
            Brandattack moves authentic end-of-line and market-seconds inventory direct from
            wholesale lots to your wardrobe. Up to <span className="font-semibold text-foreground">70% off RRP</span>,
            limited stock, no restocks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black hover:opacity-90"
            >
              Attack the shop →
            </Link>
            <Link
              href="/about"
              className="rounded-sm border border-[var(--border)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider hover:border-[var(--accent)]"
            >
              How it works
            </Link>
          </div>
          <div className="mt-12 grid max-w-2xl grid-cols-3 gap-6 border-t border-[var(--border)] pt-8 font-mono text-xs uppercase tracking-wider">
            <Stat label="Current SKUs" value={`${all.length}+`} />
            <Stat label="In inventory" value="21,000+" />
            <Stat label="Avg. discount" value="60% off" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold sm:text-3xl">Biggest discounts</h2>
          <Link href="/shop" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
            See all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-bold sm:text-3xl">Shop by category</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <CategoryCard title="Footwear" href="/shop?division=FOOTWEAR" />
          <CategoryCard title="Apparel" href="/shop?division=APPAREL" />
          <CategoryCard title="Kids" href="/shop?gender=KIDS" />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-foreground sm:text-2xl">{value}</div>
      <div className="text-[var(--muted)]">{label}</div>
    </div>
  );
}

function CategoryCard({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex aspect-[3/2] items-end justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:border-[var(--accent)]"
    >
      <div>
        <div className="text-xl font-bold sm:text-2xl">{title}</div>
        <div className="mt-1 font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
          Shop now
        </div>
      </div>
      <span className="font-mono text-2xl text-[var(--accent)] transition-transform group-hover:translate-x-1">
        →
      </span>
    </Link>
  );
}
