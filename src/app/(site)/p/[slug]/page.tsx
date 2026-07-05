import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/ProductGallery";
import { SizeSelector } from "@/components/SizeSelector";
import { ProductCard } from "@/components/ProductCard";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/products";
import { discountPercent, formatUsd } from "@/lib/format";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found — Brand Stoxx" };
  return {
    title: `${product.title} — Brand Stoxx`,
    description: `${product.brand} ${product.productGroup.toLowerCase()} (${product.articleNo}) at ${discountPercent(product)}% off RRP.`,
    openGraph: {
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const off = discountPercent(product);
  const saving = product.rrpUsd - product.priceUsd;
  const related = await getRelatedProducts(product.id, product.productGroup, 4);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="border-b border-rule">
        <nav className="label-mono-sm mx-auto flex max-w-[1400px] items-center gap-2 px-6 py-3 text-ink-faded">
          <Link href="/" className="hover:text-accent">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-accent">Shop</Link>
          <span>/</span>
          <Link href={`/shop?division=${product.division}`} className="hover:text-accent">
            {product.division.toLowerCase()}
          </Link>
          <span>/</span>
          <span className="text-ink">{product.articleNo}</span>
        </nav>
      </div>

      {/* Main product */}
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          {/* Gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery images={product.images} alt={product.title} />
          </div>

          {/* Info */}
          <div>
            <div className="stripes-3 text-ink mb-4">
              <span /><span /><span />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-ink-faded">
              {product.brand}
            </div>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl lg:text-6xl">
              {product.title}
            </h1>
            <div className="label-mono-sm mt-3 flex flex-wrap gap-x-3 gap-y-1 text-ink-faded">
              <span>{product.articleNo}</span>
              {product.season && (<><span>·</span><span>{product.season}</span></>)}
              <span>·</span>
              <span>{product.gender.toLowerCase()}</span>
            </div>

            {/* Pricing — bigger, bolder, Adidas style */}
            <div className="mt-8 border-y border-ink py-6">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <div className="text-3xl font-bold text-ink">{formatUsd(product.priceUsd)}</div>
                {off > 0 && (
                  <>
                    <div className="text-lg text-ink-faded line-through">
                      {formatUsd(product.rrpUsd)}
                    </div>
                    <div className="ml-auto flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-accent">
                      <span>Save {formatUsd(saving)}</span>
                      <span aria-hidden>·</span>
                      <span>−{off}%</span>
                    </div>
                  </>
                )}
              </div>
              <p className="mt-3 text-xs text-ink-faded">
                Prices in USD. Shipping calculated at checkout.
              </p>
            </div>

            {/* Size selector */}
            <div className="mt-8">
              <SizeSelector product={product} />
            </div>

            {/* Spec list — Adidas-style flat rows */}
            <div className="mt-10 border-t border-rule">
              <Spec label="Brand" value={product.brand} />
              <Spec label="Article" value={product.articleNo} />
              <Spec label="Season" value={product.season || "—"} />
              <Spec label="Division" value={titleCase(product.division)} />
              <Spec label="Cut for" value={titleCase(product.gender)} />
              <Spec label="Category" value={titleCase(product.productType)} />
              {product.sportsCode && (
                <Spec label="Discipline" value={titleCase(product.sportsCode)} />
              )}
            </div>

            {/* Accordion */}
            <div className="mt-8 border-t border-ink">
              <Accordion title="Shipping & delivery">
                <p>
                  Dispatched within 2 business days from our Singapore hub. 3–8 business days to most
                  Asia-Pacific destinations. Free on orders over $150 USD.
                </p>
              </Accordion>
              <Accordion title="Returns">
                <p>
                  Exchange within 14 days for a different size if we have it. Closeout pricing means no
                  change-of-mind returns. Defects refunded or replaced.
                </p>
              </Accordion>
              <Accordion title="Authenticity">
                <p>
                  Sourced from authorised wholesale channels. Every item is genuine, brand-new, in
                  original packaging where applicable.
                </p>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-rule bg-paper-warm">
          <div className="mx-auto max-w-[1400px] px-6 py-16">
            <header className="mb-8 flex items-end justify-between">
              <div>
                <div className="stripes-row text-ink mb-4">
                  <span /><span /><span />
                </div>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl">
                  You might also like
                </h2>
              </div>
              <Link
                href={`/shop?productGroup=${product.productGroup}`}
                className="hidden text-sm font-bold uppercase tracking-wider text-ink underline-offset-4 hover:underline sm:block"
              >
                View all →
              </Link>
            </header>
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-rule py-3">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-faded">{label}</span>
      <span className="text-sm text-ink">{value || "—"}</span>
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-rule">
      <summary className="flex cursor-pointer items-center justify-between py-4 list-none [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-bold uppercase tracking-wider text-ink">{title}</span>
        <span className="text-lg text-ink-faded transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="pb-5 text-sm leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+|_|\//)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");
}
