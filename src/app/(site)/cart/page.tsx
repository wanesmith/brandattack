"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { formatUsd } from "@/lib/format";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.items.reduce((n, i) => n + i.qty * i.priceUsd, 0));
  const remove = useCart((s) => s.remove);
  const updateQty = useCart((s) => s.updateQty);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ sku: i.sku, qty: i.qty })) }),
      });
      let data: { url?: string; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        /* server returned non-JSON */
      }
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? `Could not start checkout (HTTP ${res.status})`);
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  if (!mounted) return <div className="mx-auto max-w-7xl px-4 py-10">Loading…</div>;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Your cart is empty</h1>
        <p className="mt-2 text-[var(--muted)]">Time to attack the shop.</p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black hover:opacity-90"
        >
          Browse →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Cart</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {items.map((it) => (
            <li key={it.sku} className="flex gap-4 py-5">
              <Link
                href={`/p/${it.productSlug}`}
                className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-sm bg-[var(--surface)] sm:h-28 sm:w-28"
              >
                {it.imageUrl && (
                  <Image src={it.imageUrl} alt={it.title} fill sizes="112px" className="object-cover" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/p/${it.productSlug}`}
                  className="block text-base font-medium hover:text-[var(--accent)]"
                >
                  {it.title}
                </Link>
                <div className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
                  Size {it.sizeLabel}
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="inline-flex items-center rounded-sm border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => updateQty(it.sku, it.qty - 1)}
                      className="px-3 py-1.5 text-sm hover:text-[var(--accent)] disabled:opacity-30"
                      disabled={it.qty <= 1}
                    >
                      −
                    </button>
                    <span className="min-w-[2rem] text-center text-sm font-medium">{it.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(it.sku, it.qty + 1)}
                      className="px-3 py-1.5 text-sm hover:text-[var(--accent)] disabled:opacity-30"
                      disabled={it.qty >= it.maxStock}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(it.sku)}
                    className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-semibold">{formatUsd(it.priceUsd * it.qty)}</div>
                <div className="text-xs text-[var(--muted)]">{formatUsd(it.priceUsd)} each</div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-md border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-wider">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Subtotal</span>
              <span>{formatUsd(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[var(--muted)]">
              <span>Shipping</span>
              <span>at checkout</span>
            </div>
            <div className="flex justify-between text-[var(--muted)]">
              <span>Taxes</span>
              <span>at checkout</span>
            </div>
          </div>
          <hr className="my-4 border-[var(--border)]" />
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs uppercase tracking-wider">Total</span>
            <span className="text-xl font-bold">{formatUsd(subtotal)}</span>
          </div>
          <button
            type="button"
            onClick={checkout}
            disabled={loading}
            className="mt-6 w-full rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Starting checkout …" : "Checkout"}
          </button>
          {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}
          <p className="mt-3 text-center text-[11px] text-[var(--muted)]">
            Secured by Stripe · USD
          </p>
        </aside>
      </div>
    </div>
  );
}
