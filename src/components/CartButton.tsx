"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { useT } from "@/components/i18n/LocaleProvider";

export function CartButton() {
  const open = useCart((s) => s.openDrawer);
  const itemCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const { t } = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? itemCount : 0;

  return (
    <button
      type="button"
      onClick={open}
      className="relative flex h-9 items-center gap-2 rounded-sm px-3 text-ink transition-colors hover:text-accent"
      aria-label={t("cart.title")}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
      </svg>
      <span className="label-mono-sm hidden text-ink-soft sm:inline">{t("header.bag")}</span>
      {count > 0 && (
        <span
          className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-paper"
          aria-hidden="true"
        >
          {count}
        </span>
      )}
    </button>
  );
}
