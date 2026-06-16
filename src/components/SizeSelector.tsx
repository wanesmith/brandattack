"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import type { Product } from "@/lib/products";

export function SizeSelector({ product }: { product: Product }) {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const add = useCart((s) => s.add);

  const variants = product.variants;
  const selectedVariant = variants.find((v) => v.sku === selectedSku) ?? null;

  if (variants.length === 0) {
    return (
      <div className="border border-rule bg-paper-warm p-4 text-center">
        <p className="label-mono text-ink-soft">Sold out</p>
      </div>
    );
  }

  function handleAdd() {
    if (!selectedVariant) return;
    add({
      sku: selectedVariant.sku,
      productId: product.id,
      productSlug: product.id,
      title: product.title,
      sizeLabel: selectedVariant.sizeLabel,
      priceUsd: product.priceUsd,
      imageUrl: product.images[0] ?? "",
      maxStock: selectedVariant.stock,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="label-mono text-ink-faded">Size</span>
        {selectedVariant && (
          <span className="label-mono-sm text-ink-soft">
            {selectedVariant.stock} in stock
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {variants.map((v) => {
          const isSelected = selectedSku === v.sku;
          const isOOS = v.stock <= 0;
          const isLow = !isOOS && v.stock <= 2;
          return (
            <button
              key={v.sku}
              type="button"
              disabled={isOOS}
              onClick={() => setSelectedSku(v.sku)}
              className={
                "group relative border px-2 py-3 font-mono text-xs transition-all " +
                (isOOS
                  ? "cursor-not-allowed border-rule text-ink-faded line-through opacity-50"
                  : isSelected
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-paper text-ink hover:border-ink")
              }
              title={isOOS ? "Sold out" : `${v.stock} in stock`}
            >
              {v.sizeLabel}
              {isLow && (
                <span className="absolute -right-1 -top-1 inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!selectedVariant}
        className={
          "label-mono mt-8 flex w-full items-center justify-center gap-2 py-4 transition-colors " +
          (selectedVariant
            ? justAdded
              ? "bg-[var(--success)] text-paper"
              : "bg-ink text-paper hover:bg-accent"
            : "cursor-not-allowed border border-rule bg-paper-warm text-ink-faded")
        }
      >
        {!selectedVariant
          ? "Select a size"
          : justAdded
            ? "Added ✓"
            : "Add to bag"}
        {selectedVariant && !justAdded && <span aria-hidden>→</span>}
      </button>
    </div>
  );
}
