"use client";
import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-store";

// Persists a lightweight cart snapshot to the server whenever the client cart
// changes (debounced), so the admin can see abandoned carts. Renders nothing.
// The cart id lives in localStorage alongside the zustand-persisted cart.
const CART_ID_KEY = "brandattack-cart-id";

function getCartId(): string {
  try {
    let id = localStorage.getItem(CART_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(CART_ID_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function CartSync() {
  const items = useCart((s) => s.items);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Don't create empty rows for visitors who never add anything; only start
  // syncing once a cart has held items (then keep syncing so clears register).
  const hadItems = useRef(false);

  useEffect(() => {
    const nonEmpty = items.length > 0;
    if (!nonEmpty && !hadItems.current) return;
    hadItems.current = hadItems.current || nonEmpty;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const payload = {
        cartId: getCartId(),
        items: items.map((i) => ({
          sku: i.sku,
          title: i.title,
          sizeLabel: i.sizeLabel,
          qty: i.qty,
          priceUsd: i.priceUsd,
        })),
      };
      fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        /* best-effort; never surface to the shopper */
      });
    }, 1200);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [items]);

  return null;
}
