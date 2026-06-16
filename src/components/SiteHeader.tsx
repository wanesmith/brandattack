import Link from "next/link";
import { CartButton } from "@/components/CartButton";

const ANNOUNCEMENTS = [
  "Free shipping across Asia over $150",
  "Authentic guarantee",
  "Up to 70% off RRP",
  "New lot inbound · Q3 2026",
  "21,082 units · 2,290 styles · sea-freighted from Singapore",
];

const PRIMARY_NAV = [
  { label: "Men", href: "/shop?gender=MEN" },
  { label: "Women", href: "/shop?gender=WOMEN" },
  { label: "Kids", href: "/shop?gender=KIDS" },
  { label: "Footwear", href: "/shop?division=FOOTWEAR" },
  { label: "Apparel", href: "/shop?division=APPAREL" },
  { label: "Brands", href: "/shop" },
  { label: "Sale", href: "/shop" },
];

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-ink bg-paper">
      {/* Announcement marquee — black bar at top, white text, Adidas style */}
      <div className="overflow-hidden bg-ink">
        <div className="relative flex h-8 items-center">
          <div className="marquee-track flex shrink-0 whitespace-nowrap">
            {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((text, i) => (
              <span
                key={i}
                className="label-mono-sm flex items-center gap-3 px-6 text-paper/80"
              >
                <span className="inline-block h-1 w-1 rounded-full bg-accent" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-4">
        {/* Wordmark — heavy sans with italic-serif accent on "attack." */}
        <Link href="/" className="flex items-baseline gap-1 tracking-tight">
          <span className="font-display text-2xl">BRAND</span>
          <span className="font-display-italic text-2xl text-accent">attack.</span>
        </Link>

        {/* Center nav — ALL CAPS heavy sans, Adidas style */}
        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group relative py-2 text-[13px] font-bold uppercase tracking-wider text-ink transition-colors hover:text-accent"
            >
              {item.label}
              <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-ink transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* Right tools */}
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <button
            type="button"
            aria-label="Search"
            className="hidden h-9 w-9 items-center justify-center text-ink transition-colors hover:text-accent sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" strokeLinecap="round" />
            </svg>
          </button>
          <Link
            href="/admin"
            aria-label="Admin"
            className="hidden h-9 w-9 items-center justify-center text-ink transition-colors hover:text-accent sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
            </svg>
          </Link>
          <CartButton />
        </div>
      </div>

      {/* Mobile nav row */}
      <nav className="flex items-center gap-5 overflow-x-auto border-t border-rule px-6 py-3 lg:hidden">
        {PRIMARY_NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="shrink-0 text-xs font-bold uppercase tracking-wider text-ink hover:text-accent"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
