"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  sku: string;
  productId: string;
  productSlug: string;
  title: string;
  sizeLabel: string;
  priceUsd: number;
  imageUrl: string;
  qty: number;
  // Snapshot of stock at the moment of add — used for client-side qty cap.
  // Real authoritative check happens server-side at checkout creation.
  maxStock: number;
};

type CartState = {
  items: CartItem[];
  drawerOpen: boolean;
  // mutators
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (sku: string) => void;
  updateQty: (sku: string, qty: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  // derived
  itemCount: () => number;
  subtotalUsd: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      add: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.sku === item.sku);
          if (existing) {
            const nextQty = Math.min(existing.qty + qty, item.maxStock);
            return {
              items: state.items.map((i) =>
                i.sku === item.sku ? { ...i, qty: nextQty } : i
              ),
              drawerOpen: true,
            };
          }
          return {
            items: [...state.items, { ...item, qty: Math.min(qty, item.maxStock) }],
            drawerOpen: true,
          };
        }),
      remove: (sku) =>
        set((state) => ({ items: state.items.filter((i) => i.sku !== sku) })),
      updateQty: (sku, qty) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.sku === sku
                ? { ...i, qty: Math.max(0, Math.min(qty, i.maxStock)) }
                : i
            )
            .filter((i) => i.qty > 0),
        })),
      clear: () => set({ items: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      itemCount: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotalUsd: () => get().items.reduce((n, i) => n + i.qty * i.priceUsd, 0),
    }),
    {
      name: "brandattack-cart",
      partialize: (state) => ({ items: state.items }), // don't persist drawerOpen
    }
  )
);
