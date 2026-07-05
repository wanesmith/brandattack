import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { filterProducts, type Filters, type Product } from "@/lib/products";
import { getActiveFacets } from "@/lib/facets";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = {
  title: "Shop — Brand Stoxx",
  description: "Authentic branded closeouts at end-of-line prices. Shop the full lot.",
};

const SORT_OPTIONS = [
  { id: "default", label: "Featured" },
  { id: "discount", label: "Biggest discount" },
  { id: "price-low", label: "Price: low to high" },
  { id: "price-high", label: "Price: high to low" },
  { id: "alpha", label: "A → Z" },
];

const ALLOWED: (keyof Filters)[] = [
  "division",
  "gender",
  "sportsCode",
  "productGroup",
  "season",
  "brand",
  "q",
];

function pickFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const out: Filters = {};
  for (const k of ALLOWED) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (typeof s === "string" && s.trim()) out[k] = s;
  }
  return out;
}

function sortProducts(items: Product[], sort: string): Product[] {
  switch (sort) {
    case "discount":
      return [...items].sort(
        (a, b) => (b.rrpUsd - b.priceUsd) - (a.rrpUsd - a.priceUsd)
      );
    case "price-low":
      return [...items].sort((a, b) => a.priceUsd - b.priceUsd);
    case "price-high":
      return [...items].sort((a, b) => b.priceUsd - a.priceUsd);
    case "alpha":
      return [...items].sort((a, b) => a.title.localeCompare(b.title));
    default:
      return items;
  }
}

function categoryHeading(filters: Filters): { title: string; subtitle: string } {
  if (filters.gender === "MEN") return { title: "Men", subtitle: "Footwear, apparel & accessories for men" };
  if (filters.gender === "WOMEN") return { title: "Women", subtitle: "Footwear, apparel & accessories for women" };
  if (filters.gender === "KIDS") return { title: "Kids", subtitle: "Junior sizes across the lot" };
  if (filters.division === "FOOTWEAR") return { title: "Footwear", subtitle: "Sneakers, runners and trainers" };
  if (filters.division === "APPAREL") return { title: "Apparel", subtitle: "Tops, pants, layers and sets" };
  if (filters.division === "HARDWARE") return { title: "Hardware", subtitle: "Bags, balls and equipment" };
  return { title: "All products", subtitle: "The full catalogue of branded closeouts." };
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = pickFilters(sp);
  const sort = typeof sp.sort === "string" ? sp.sort : "default";

  const [allProducts, facets] = await Promise.all([
    filterProducts(filters),
    getActiveFacets(),
  ]);

  const products = sortProducts(allProducts, sort);
  const heading = categoryHeading(filters);
  const activeCount = Object.keys(filters).length;

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-6 pt-8 lg:pt-12">
          <nav className="label-mono-sm flex items-center gap-2 text-ink-faded">
            <Link href="/" className="hover:text-accent">
              Home
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-accent">
              Shop
            </Link>
            {filters.division && (
              <>
                <span>/</span>
                <span className="text-ink">{filters.division.toLowerCase()}</span>
              </>
            )}
            {filters.gender && (
              <>
                <span>/</span>
                <span className="text-ink">{filters.gender.toLowerCase()}</span>
              </>
            )}
          </nav>

          <div className="mt-6 pb-8">
            <div className="stripes-row text-ink mb-4">
              <span /><span /><span />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl">
              {heading.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-ink-soft">{heading.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Sort bar — sticky */}
      <div className="sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-3">
          <p className="label-mono-sm text-ink-faded">
            {products.length} {products.length === 1 ? "item" : "items"}
            {activeCount > 0 && (
              <>
                {" · "}
                <Link href="/shop" className="text-accent hover:underline">
                  clear filters
                </Link>
              </>
            )}
          </p>
          <form className="flex items-center gap-3">
            {Object.entries(filters).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <label htmlFor="sort" className="label-mono-sm text-ink-faded">
              Sort
            </label>
            <select
              name="sort"
              id="sort"
              defaultValue={sort}
              className="cursor-pointer border-b border-ink bg-transparent py-1 pr-6 text-xs font-bold uppercase tracking-wider text-ink focus:border-accent focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="submit" className="text-xs font-bold uppercase tracking-wider text-ink underline-offset-4 hover:underline">
              Apply
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10">
          {/* Filters */}
          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto lg:pb-10">
            {facets.map((facet) => (
              <FacetGroup key={facet.id} facet={facet} current={filters} />
            ))}
            {facets.length === 0 && (
              <p className="label-mono-sm text-ink-faded">No filters configured.</p>
            )}
          </aside>

          {/* Grid */}
          <section>
            {products.length === 0 ? (
              <div className="border border-rule bg-paper-warm p-16 text-center">
                <div className="font-display text-3xl text-ink">
                  Nothing matches.
                </div>
                <Link
                  href="/shop"
                  className="btn-outline mt-8"
                >
                  Clear filters →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 6} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function FacetGroup({
  facet,
  current,
}: {
  facet: { id: string; label: string; values: { value: string; label: string }[] };
  current: Filters;
}) {
  if (facet.values.length === 0) return null;
  return (
    <details open className="group border-t border-rule py-4 first:border-t-0 first:pt-0">
      <summary className="flex cursor-pointer items-center justify-between list-none [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-bold uppercase tracking-wider text-ink">{facet.label}</span>
        <span className="text-base text-ink-faded transition-transform group-open:rotate-45">+</span>
      </summary>
      <ul className="mt-3 space-y-1">
        {facet.values.map((opt) => {
          const selected = current[facet.id as keyof Filters] === opt.value;
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(current)) {
            if (v && k !== facet.id) params.set(k, v);
          }
          if (!selected) params.set(facet.id, opt.value);
          const href = params.toString() ? `/shop?${params.toString()}` : "/shop";
          return (
            <li key={opt.value}>
              <Link
                href={href}
                className={
                  "block py-1 text-sm transition-colors " +
                  (selected ? "font-bold text-ink underline underline-offset-4" : "text-ink-soft hover:text-ink")
                }
              >
                {opt.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
