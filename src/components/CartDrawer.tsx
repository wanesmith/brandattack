"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { formatUsd } from "@/lib/format";

export function CartDrawer() {
  const open = useCart((s) => s.drawerOpen);
  const close = useCart((s) => s.closeDrawer);
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.items.reduce((n, i) => n + i.qty * i.priceUsd, 0));
  const remove = useCart((s) => s.remove);
  const updateQty = useCart((s) => s.updateQty);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock body scroll while open
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, mounted]);

  // Close on Escape
  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, mounted]);

  if (!mounted) return null;

  return (
    <>
      <div
        className={
          "fixed inset-0 z-40 bg-black/60 transition-opacity " +
          (open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")
        }
        onClick={close}
        aria-hidden={!open}
      />
      <aside
        className={
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--background)] shadow-2xl transition-transform duration-300 " +
          (open ? "translate-x-0" : "translate-x-full")
        }
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
            Cart ({items.reduce((n, i) => n + i.qty, 0)})
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-[var(--muted)] hover:text-foreground"
            aria-label="Close cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
                Your cart is empty
              </p>
              <Link
                href="/shop"
                onClick={close}
                className="mt-4 rounded-sm bg-[var(--accent)] px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:opacity-90"
              >
                Browse the shop →
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((it) => (
                <li key={it.sku} className="flex gap-3">
                  <Link
                    href={`/p/${it.productSlug}`}
                    onClick={close}
                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-sm bg-[var(--surface)]"
                  >
                    {it.imageUrl && (
                      <Image src={it.imageUrl} alt={it.title} fill sizes="80px" className="object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/p/${it.productSlug}`}
                      onClick={close}
                      className="block truncate text-sm font-medium hover:text-[var(--accent)]"
                    >
                      {it.title}
                    </Link>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
                      Size {it.sizeLabel} · {formatUsd(it.priceUsd)}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <QtyControl
                        qty={it.qty}
                        max={it.maxStock}
                        onChange={(q) => updateQty(it.sku, q)}
                      />
                      <button
                        type="button"
                        onClick={() => remove(it.sku)}
                        className="ml-auto text-[11px] text-[var(--muted)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold">
                    {formatUsd(it.priceUsd * it.qty)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-[var(--border)] px-5 py-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
                Subtotal
              </span>
              <span className="text-lg font-bold">{formatUsd(subtotal)}</span>
            </div>
            <p className="mb-3 text-[11px] text-[var(--muted)]">
              Shipping &amp; taxes calculated at checkout.
            </p>
            <CheckoutButton />
          </footer>
        )}
      </aside>
    </>
  );
}

function QtyControl({
  qty,
  max,
  onChange,
}: {
  qty: number;
  max: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-sm border border-[var(--border)]">
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        className="px-2 py-1 text-sm hover:text-[var(--accent)] disabled:opacity-30"
        disabled={qty <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-medium">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        className="px-2 py-1 text-sm hover:text-[var(--accent)] disabled:opacity-30"
        disabled={qty >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

async function safeJson(res: Response): Promise<{ url?: string; error?: string } | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function CheckoutButton() {
  const items = useCart((s) => s.items);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ sku: i.sku, qty: i.qty })),
        }),
      });
      const data = await safeJson(res);
      if (!res.ok || !data?.url) {
        throw new Error(
          data?.error ?? `Could not start checkout (HTTP ${res.status})`
        );
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={loading || items.length === 0}
        className="w-full rounded-sm bg-[var(--accent)] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:text-[var(--muted)]"
      >
        {loading ? "Starting checkout …" : "Checkout"}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
    </>
  );
}
