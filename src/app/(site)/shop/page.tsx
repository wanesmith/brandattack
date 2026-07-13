import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { filterProducts, getAvailableSizes, type Filters, type Product } from "@/lib/products";
import { getActiveFacets } from "@/lib/facets";
import { getT } from "@/lib/i18n/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = {
  title: "Shop — Brand Stoxx",
  description: "Authentic branded closeouts at end-of-line prices. Shop the full lot.",
};

const SORT_OPTIONS = [
  { id: "default", key: "shop.sortFeatured" },
  { id: "discount", key: "shop.sortDiscount" },
  { id: "price-low", key: "shop.sortPriceLow" },
  { id: "price-high", key: "shop.sortPriceHigh" },
  { id: "alpha", key: "shop.sortAlpha" },
];

// Facet group headings mapped to i18n keys by facet id; unmapped ids fall back
// to the facet's own label.
const FACET_LABEL_KEY: Record<string, string> = {
  division: "facets.division",
  gender: "facets.gender",
  sportsCode: "facets.sport",
  productGroup: "facets.category",
  season: "facets.season",
  brand: "facets.brand",
};

// Known closed-set facet values mapped to existing nav keys; everything else
// (brands, seasons, sport codes, …) falls back to the value's own label.
const FACET_VALUE_KEY: Record<string, string> = {
  FOOTWEAR: "nav.footwear",
  APPAREL: "nav.apparel",
  HARDWARE: "nav.hardware",
  MEN: "nav.men",
  WOMEN: "nav.women",
  KIDS: "nav.kids",
};

const FACET_KEYS = [
  "division",
  "gender",
  "sportsCode",
  "productGroup",
  "season",
  "brand",
  "size",
] as const;

function pickFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const out: Filters = {};
  for (const k of FACET_KEYS) {
    const v = sp[k];
    const arr = (Array.isArray(v) ? v : v != null ? [v] : []).filter(
      (x): x is string => typeof x === "string" && x.trim() !== ""
    );
    if (arr.length) out[k] = arr;
  }
  const qv = sp.q;
  const q = Array.isArray(qv) ? qv[0] : qv;
  if (typeof q === "string" && q.trim()) out.q = q.trim();
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

// Returns i18n keys; the component resolves them with t().
function categoryHeading(filters: Filters): { titleKey: string; subtitleKey: string } {
  const g = filters.gender ?? [];
  const d = filters.division ?? [];
  // Only use a specific heading when a single value is selected in that facet.
  if (g.length === 1 && g[0] === "MEN") return { titleKey: "nav.men", subtitleKey: "shop.subMen" };
  if (g.length === 1 && g[0] === "WOMEN") return { titleKey: "nav.women", subtitleKey: "shop.subWomen" };
  if (g.length === 1 && g[0] === "KIDS") return { titleKey: "nav.kids", subtitleKey: "shop.subKids" };
  if (d.length === 1 && d[0] === "FOOTWEAR") return { titleKey: "nav.footwear", subtitleKey: "shop.subFootwear" };
  if (d.length === 1 && d[0] === "APPAREL") return { titleKey: "nav.apparel", subtitleKey: "shop.subApparel" };
  if (d.length === 1 && d[0] === "HARDWARE") return { titleKey: "nav.hardware", subtitleKey: "shop.subHardware" };
  return { titleKey: "shop.allProducts", subtitleKey: "shop.allProductsSub" };
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const t = await getT();
  const filters = pickFilters(sp);
  const sort = typeof sp.sort === "string" ? sp.sort : "default";

  const [allProducts, facets, sizes] = await Promise.all([
    filterProducts(filters),
    getActiveFacets(),
    getAvailableSizes(filters),
  ]);

  // Size lives on variants, not products, so it isn't part of the DB facet
  // system — synthesize a facet group for the sidebar.
  const sizeFacet =
    sizes.length > 0
      ? { id: "size", label: "Size", values: sizes.map((s) => ({ value: s, label: s })) }
      : null;

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
              {t("shop.home")}
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-accent">
              {t("shop.shopCrumb")}
            </Link>
            {filters.division?.length ? (
              <>
                <span>/</span>
                <span className="text-ink">{filters.division.join(", ").toLowerCase()}</span>
              </>
            ) : null}
            {filters.gender?.length ? (
              <>
                <span>/</span>
                <span className="text-ink">{filters.gender.join(", ").toLowerCase()}</span>
              </>
            ) : null}
          </nav>

          <div className="mt-6 pb-8">
            <div className="stripes-row text-ink mb-4">
              <span /><span /><span />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl">
              {t(heading.titleKey)}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-ink-soft">{t(heading.subtitleKey)}</p>
          </div>
        </div>
      </div>

      {/* Sort bar — sticky */}
      <div className="sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-3">
          <p className="label-mono-sm text-ink-faded">
            {products.length} {products.length === 1 ? t("shop.item") : t("shop.items")}
            {activeCount > 0 && (
              <>
                {" · "}
                <Link href="/shop" className="text-accent hover:underline">
                  {t("shop.clearFilters")}
                </Link>
              </>
            )}
          </p>
          <form className="flex items-center gap-3">
            {Object.entries(filters).flatMap(([k, v]) =>
              Array.isArray(v)
                ? v.map((val, i) => (
                    <input key={`${k}-${i}`} type="hidden" name={k} value={val} />
                  ))
                : [<input key={k} type="hidden" name={k} value={v as string} />]
            )}
            <label htmlFor="sort" className="label-mono-sm text-ink-faded">
              {t("shop.sort")}
            </label>
            <select
              name="sort"
              id="sort"
              defaultValue={sort}
              className="cursor-pointer border-b border-ink bg-transparent py-1 pr-6 text-xs font-bold uppercase tracking-wider text-ink focus:border-accent focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {t(o.key)}
                </option>
              ))}
            </select>
            <button type="submit" className="text-xs font-bold uppercase tracking-wider text-ink underline-offset-4 hover:underline">
              {t("shop.apply")}
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10">
          {/* Filters */}
          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto lg:pb-10">
            {facets.map((facet) => (
              <FacetGroup key={facet.id} facet={facet} current={filters} t={t} />
            ))}
            {sizeFacet && <FacetGroup facet={sizeFacet} current={filters} t={t} />}
            {facets.length === 0 && !sizeFacet && (
              <p className="label-mono-sm text-ink-faded">{t("shop.noFilters")}</p>
            )}
          </aside>

          {/* Grid */}
          <section>
            {products.length === 0 ? (
              <div className="border border-rule bg-paper-warm p-16 text-center">
                <div className="font-display text-3xl text-ink">
                  {t("shop.nothingMatches")}
                </div>
                <Link
                  href="/shop"
                  className="btn-outline mt-8"
                >
                  {t("shop.clearFiltersCta")} →
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
  t,
}: {
  facet: { id: string; label: string; values: { value: string; label: string }[] };
  current: Filters;
  t: (key: string) => string;
}) {
  if (facet.values.length === 0) return null;
  return (
    <details open className="group border-t border-rule py-4 first:border-t-0 first:pt-0">
      <summary className="flex cursor-pointer items-center justify-between list-none [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-bold uppercase tracking-wider text-ink">
          {FACET_LABEL_KEY[facet.id] ? t(FACET_LABEL_KEY[facet.id]) : facet.label}
        </span>
        <span className="text-base text-ink-faded transition-transform group-open:rotate-45">+</span>
      </summary>
      <ul
        className={
          "mt-3 space-y-1" +
          (facet.values.length > 15 ? " max-h-64 overflow-y-auto pr-1" : "")
        }
      >
        {facet.values.map((opt) => {
          const currentVals = (current[facet.id as keyof Filters] as string[] | undefined) ?? [];
          const selected = currentVals.includes(opt.value);
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(current)) {
            if (k === facet.id) continue;
            // Changing any other filter (e.g. gender) resets the size choice,
            // since available sizes depend on the category being browsed.
            if (k === "size" && facet.id !== "size") continue;
            if (Array.isArray(v)) v.forEach((val) => params.append(k, val));
            else if (v) params.append(k, v as string);
          }
          // Toggle this value within its facet (multi-select).
          const nextVals = selected
            ? currentVals.filter((x) => x !== opt.value)
            : [...currentVals, opt.value];
          nextVals.forEach((val) => params.append(facet.id, val));
          const href = params.toString() ? `/shop?${params.toString()}` : "/shop";
          return (
            <li key={opt.value}>
              <Link
                href={href}
                className={
                  "flex items-center gap-2 py-1 text-sm transition-colors " +
                  (selected ? "font-bold text-ink" : "text-ink-soft hover:text-ink")
                }
              >
                <span
                  aria-hidden
                  className={
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center border text-[9px] leading-none " +
                    (selected ? "border-ink bg-ink text-paper" : "border-rule")
                  }
                >
                  {selected ? "✓" : ""}
                </span>
                {FACET_VALUE_KEY[opt.value] ? t(FACET_VALUE_KEY[opt.value]) : opt.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
