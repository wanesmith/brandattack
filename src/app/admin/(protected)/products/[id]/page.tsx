import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
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

  // Units sold for this product (orders that count as a sale).
  const soldRow = await db
    .select({ units: sql<number>`COALESCE(SUM(${schema.orderItems.qty}), 0)::int` })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .innerJoin(schema.variants, eq(schema.variants.sku, schema.orderItems.sku))
    .where(and(eq(schema.variants.productId, id), inArray(schema.orders.status, ["paid", "shipped"])));
  const sold = Number(soldRow[0]?.units ?? 0);
  const inStock = variants.reduce((a, v) => a + v.stock, 0);

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
      <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
        <span className="rounded-sm bg-[var(--background)] px-3 py-1.5">
          Total <span className="font-bold text-[var(--foreground)]">{(inStock + sold).toLocaleString()}</span>
        </span>
        <span className="rounded-sm bg-[var(--background)] px-3 py-1.5">
          In stock <span className="font-bold text-[var(--foreground)]">{inStock.toLocaleString()}</span>
        </span>
        <span className="rounded-sm bg-[var(--background)] px-3 py-1.5">
          Sold <span className="font-bold text-emerald-400">{sold.toLocaleString()}</span>
        </span>
      </div>

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
