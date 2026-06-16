import Image from "next/image";
import Link from "next/link";
import { discountPercent, formatUsd } from "@/lib/format";
import type { Product } from "@/lib/products";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const off = discountPercent(product);
  const cover = product.images[0];
  const hover = product.images[1] ?? product.images[0];

  return (
    <Link href={`/p/${product.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden bg-paper-warm">
        {cover ? (
          <>
            <Image
              src={cover}
              alt={product.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              priority={priority}
              className="swap-base object-cover"
            />
            {hover && hover !== cover && (
              <Image
                src={hover}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="swap-hover object-cover"
                aria-hidden="true"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center label-mono text-ink-faded">
            No image
          </div>
        )}

        {off > 0 && (
          <span className="absolute left-0 top-0 bg-paper px-2.5 py-1 font-mono text-[11px] font-bold tracking-tight text-ink">
            −{off}%
          </span>
        )}

        {/* Adidas-style "+" reveal on hover, bottom-right */}
        <span className="pointer-events-none absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center bg-paper text-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </div>

      {/* Tight label block, Adidas-grid feel */}
      <div className="mt-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faded">
          {product.brand}
        </div>
        <div className="mt-1 truncate text-[14px] font-medium leading-snug">{product.title}</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[14px] font-bold text-ink">{formatUsd(product.priceUsd)}</span>
          {off > 0 && (
            <span className="text-[12px] text-ink-faded line-through">
              {formatUsd(product.rrpUsd)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
