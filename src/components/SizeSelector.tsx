"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { formatUsd } from "@/lib/format";
import type { Product } from "@/lib/products";

// Bulk-friendly picker: enter a quantity per size, then add them all to the
// bag in one action (this is a liquidation lot — buyers take runs of sizes).
export function SizeSelector({ product }: { product: Product }) {
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [justAdded, setJustAdded] = useState(false);
  const add = useCart((s) => s.add);

  const variants = product.variants;
  const inStock = variants.filter((v) => v.stock > 0);

  if (inStock.length === 0) {
    return (
      <div className="border border-rule bg-paper-warm p-4 text-center">
        <p className="label-mono text-ink-soft">Sold out</p>
      </div>
    );
  }

  const setQty = (sku: string, next: number, max: number) =>
    setQtys((q) => {
      const clamped = Math.max(0, Math.min(next, max));
      const copy = { ...q };
      if (clamped === 0) delete copy[sku];
      else copy[sku] = clamped;
      return copy;
    });

  const totalUnits = Object.values(qtys).reduce((n, v) => n + v, 0);
  const totalUsd = totalUnits * product.priceUsd;

  function handleAdd() {
    const chosen = variants.filter((v) => (qtys[v.sku] ?? 0) > 0);
    if (chosen.length === 0) return;
    for (const v of chosen) {
      add(
        {
          sku: v.sku,
          productId: product.id,
          productSlug: product.id,
          title: product.title,
          sizeLabel: v.sizeLabel,
          priceUsd: product.priceUsd,
          imageUrl: product.images[0] ?? "",
          maxStock: v.stock,
        },
        qtys[v.sku]
      );
    }
    setQtys({});
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="label-mono text-ink-faded">Sizes & quantities</span>
        <span className="label-mono-sm text-ink-soft">
          {inStock.length} size{inStock.length === 1 ? "" : "s"} available
        </span>
      </div>

      <div className="divide-y divide-rule border border-rule">
        {variants.map((v) => {
          const isOOS = v.stock <= 0;
          const isLow = !isOOS && v.stock <= 2;
          const qty = qtys[v.sku] ?? 0;
          return (
            <div
              key={v.sku}
              className={
                "flex items-center justify-between gap-3 px-3 py-2.5 " +
                (isOOS ? "opacity-45" : "")
              }
            >
              <div className="min-w-0">
                <span className="font-mono text-sm text-ink">{v.sizeLabel}</span>
                <span className="ml-2 label-mono-sm text-ink-soft">
                  {isOOS ? "Sold out" : isLow ? `Only ${v.stock} left` : `${v.stock} in stock`}
                </span>
              </div>

              {isOOS ? (
                <span className="font-mono text-xs text-ink-faded line-through">0</span>
              ) : (
                <div className="flex items-center">
                  <button
                    type="button"
                    aria-label={`Decrease ${v.sizeLabel}`}
                    onClick={() => setQty(v.sku, qty - 1, v.stock)}
                    disabled={qty === 0}
                    className="flex h-8 w-8 items-center justify-center border border-rule text-ink disabled:opacity-40 hover:border-ink"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={v.stock}
                    value={qty === 0 ? "" : qty}
                    placeholder="0"
                    onChange={(e) =>
                      setQty(v.sku, parseInt(e.target.value, 10) || 0, v.stock)
                    }
                    className="h-8 w-12 border-y border-rule bg-paper text-center font-mono text-sm text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    aria-label={`Increase ${v.sizeLabel}`}
                    onClick={() => setQty(v.sku, qty + 1, v.stock)}
                    disabled={qty >= v.stock}
                    className="flex h-8 w-8 items-center justify-center border border-rule text-ink disabled:opacity-40 hover:border-ink"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalUnits > 0 && (
        <div className="mt-4 flex items-baseline justify-between label-mono text-ink-soft">
          <span>
            {totalUnits} unit{totalUnits === 1 ? "" : "s"} selected
          </span>
          <span className="text-ink">{formatUsd(totalUsd)}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={totalUnits === 0}
        className={
          "label-mono mt-4 flex w-full items-center justify-center gap-2 py-4 transition-colors " +
          (totalUnits > 0
            ? justAdded
              ? "bg-[var(--success)] text-paper"
              : "bg-ink text-paper hover:bg-accent"
            : "cursor-not-allowed border border-rule bg-paper-warm text-ink-faded")
        }
      >
        {justAdded
          ? "Added ✓"
          : totalUnits === 0
            ? "Enter quantities"
            : `Add ${totalUnits} to bag`}
        {totalUnits > 0 && !justAdded && <span aria-hidden>→</span>}
      </button>
    </div>
  );
}
