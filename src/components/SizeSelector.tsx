"use client";
import { useState } from "react";
import type { Variant } from "@/lib/products";

export function SizeSelector({ variants }: { variants: Variant[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedVariant = variants.find((v) => v.sku === selected) ?? null;

  if (variants.length === 0) {
    return <div className="text-sm text-[var(--muted)]">Out of stock</div>;
  }

  return (
    <div>
      <div className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Size
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {variants.map((v) => {
          const isSelected = selected === v.sku;
          const isOOS = v.stock <= 0;
          return (
            <button
              key={v.sku}
              type="button"
              disabled={isOOS}
              onClick={() => setSelected(v.sku)}
              className={
                "rounded-sm border px-3 py-2 text-sm font-medium transition-colors " +
                (isOOS
                  ? "cursor-not-allowed border-[var(--border)] text-[var(--muted)] line-through opacity-50"
                  : isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                    : "border-[var(--border)] hover:border-[var(--accent)]")
              }
              title={isOOS ? "Sold out" : `${v.stock} in stock`}
            >
              {v.sizeLabel}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selectedVariant}
        className="mt-6 w-full rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:text-[var(--muted)]"
      >
        {selectedVariant ? `Add to cart — ${selectedVariant.sizeLabel}` : "Select a size"}
      </button>
      <p className="mt-2 text-center text-xs text-[var(--muted)]">
        Demo — checkout is not enabled yet
      </p>
    </div>
  );
}
