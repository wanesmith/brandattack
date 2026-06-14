import Image from "next/image";
import Link from "next/link";
import { discountPercent, formatUsd, type Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product);
  const cover = product.images[0];
  return (
    <Link href={`/p/${product.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-md bg-[var(--surface)]">
        {cover ? (
          <Image
            src={cover}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">No image</div>
        )}
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-sm bg-[var(--accent)] px-1.5 py-0.5 font-mono text-xs font-bold text-black">
            {off}% OFF
          </span>
        )}
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{product.title}</div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
            {product.brand} · {product.gender}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{formatUsd(product.priceUsd)}</div>
          {off > 0 && (
            <div className="text-[11px] text-[var(--muted)] line-through">{formatUsd(product.rrpUsd)}</div>
          )}
        </div>
      </div>
    </Link>
  );
}
