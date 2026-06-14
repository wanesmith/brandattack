import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { filterProducts, uniqueValues } from "@/lib/products";

type SearchParams = Promise<{
  division?: string;
  gender?: string;
  sportsCode?: string;
  q?: string;
}>;

export const metadata = {
  title: "Shop — Brandattack",
  description: "Branded closeouts and market seconds at deep discounts.",
};

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const products = filterProducts(sp);

  const divisions = uniqueValues("division");
  const genders = uniqueValues("gender");
  const sports = uniqueValues("sportsCode");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Shop</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {products.length} {products.length === 1 ? "item" : "items"}
          {Object.values(sp).filter(Boolean).length > 0 && (
            <>
              {" "}
              ·{" "}
              <Link href="/shop" className="text-[var(--accent)] hover:underline">
                clear filters
              </Link>
            </>
          )}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6 text-sm">
          <FilterGroup
            current={sp}
            param="division"
            label="Division"
            options={divisions}
            labelMap={{ APPAREL: "Apparel", FOOTWEAR: "Footwear", HARDWARE: "Hardware" }}
          />
          <FilterGroup
            current={sp}
            param="gender"
            label="Gender"
            options={genders}
            labelMap={{ MEN: "Men", WOMEN: "Women", UNISEX: "Unisex", KIDS: "Kids" }}
          />
          <FilterGroup current={sp} param="sportsCode" label="Sport" options={sports} />
        </aside>

        <section>
          {products.length === 0 ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
              Nothing matches those filters.{" "}
              <Link href="/shop" className="text-[var(--accent)] hover:underline">
                Clear filters →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterGroup({
  current,
  param,
  label,
  options,
  labelMap = {},
}: {
  current: Record<string, string | undefined>;
  param: string;
  label: string;
  options: string[];
  labelMap?: Record<string, string>;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <ul className="space-y-1">
        {options.map((opt) => {
          const selected = current[param] === opt;
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(current)) {
            if (v && k !== param) params.set(k, v);
          }
          if (!selected) params.set(param, opt);
          const href = params.toString() ? `/shop?${params.toString()}` : "/shop";
          return (
            <li key={opt}>
              <Link
                href={href}
                className={
                  "block rounded px-2 py-1 transition-colors " +
                  (selected
                    ? "bg-[var(--accent)] text-black"
                    : "hover:bg-[var(--surface)] hover:text-[var(--accent)]")
                }
              >
                {labelMap[opt] ?? titleCase(opt)}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+|_/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");
}
