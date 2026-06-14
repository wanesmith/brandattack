import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/ProductGallery";
import { SizeSelector } from "@/components/SizeSelector";
import { ProductCard } from "@/components/ProductCard";
import {
  discountPercent,
  formatUsd,
  getAllProducts,
  getProductBySlug,
} from "@/lib/products";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Not found — Brandattack" };
  return {
    title: `${product.title} — Brandattack`,
    description: `${product.brand} ${product.productGroup.toLowerCase()} (${product.articleNo}) at ${discountPercent(product)}% off RRP.`,
    openGraph: {
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const off = discountPercent(product);
  const related = getAllProducts()
    .filter((p) => p.id !== product.id && p.productGroup === product.productGroup)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-6 text-xs text-[var(--muted)]">
        <Link href="/shop" className="hover:text-[var(--accent)]">Shop</Link>
        <span className="mx-2">/</span>
        <Link href={`/shop?division=${product.division}`} className="hover:text-[var(--accent)]">
          {product.division}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.articleNo}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} alt={product.title} />

        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
            {product.brand} · {product.articleNo} · {product.season}
          </div>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{product.title}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <div className="text-3xl font-bold">{formatUsd(product.priceUsd)}</div>
            {off > 0 && (
              <>
                <div className="text-lg text-[var(--muted)] line-through">
                  {formatUsd(product.rrpUsd)}
                </div>
                <span className="rounded-sm bg-[var(--accent)] px-2 py-0.5 font-mono text-xs font-bold text-black">
                  {off}% OFF
                </span>
              </>
            )}
          </div>

          <div className="mt-2 text-xs text-[var(--muted)]">
            All prices in USD · {product.totalStock} units total stock
          </div>

          <hr className="my-6 border-[var(--border)]" />

          <SizeSelector variants={product.variants} />

          <hr className="my-6 border-[var(--border)]" />

          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <Spec label="Division" value={product.division} />
            <Spec label="Gender" value={product.gender} />
            <Spec label="Category" value={product.productGroup} />
            <Spec label="Type" value={product.productType} />
            <Spec label="Sport" value={product.sportsCode} />
            <Spec label="Season" value={product.season} />
            <Spec label="Article No" value={product.articleNo} mono />
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-xl font-bold">More {product.productGroup.toLowerCase()}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Spec({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">{label}</dt>
      <dd className={mono ? "font-mono" : ""}>{value || "—"}</dd>
    </>
  );
}
