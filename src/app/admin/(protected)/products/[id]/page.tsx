import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ProductEditForm } from "./ProductEditForm";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ProductDetail({ params }: { params: Params }) {
  const { id } = await params;

  const rows = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
  const product = rows[0];
  if (!product) notFound();

  const variants = await db
    .select()
    .from(schema.variants)
    .where(eq(schema.variants.productId, id))
    .orderBy(asc(schema.variants.size));

  const images = await db
    .select({ url: schema.productImages.url })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, id))
    .orderBy(asc(schema.productImages.position));

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/products"
        className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
      >
        ← Back to products
      </Link>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-bold">{product.title}</h1>
        <span className="font-mono text-xs text-[var(--muted)]">{product.articleNo}</span>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {product.division} · {product.gender} · {product.season || "—"}
      </p>

      <ProductEditForm
        product={{
          id: product.id,
          title: product.title,
          description: product.description,
          brand: product.brand,
          priceUsd: String(product.priceUsd),
          rrpUsd: String(product.rrpUsd),
          active: product.active,
        }}
        variants={variants.map((v) => ({
          sku: v.sku,
          sizeLabel: v.sizeLabel,
          stock: v.stock,
          reserved: v.reserved,
        }))}
        initialImages={images.map((i) => i.url)}
      />
    </div>
  );
}
