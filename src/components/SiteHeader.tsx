import Link from "next/link";
import { CartButton } from "@/components/CartButton";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getBranding } from "@/lib/settings";
import { getCurrentUser } from "@/lib/customer-auth";
import { getT } from "@/lib/i18n/server";

const PRIMARY_NAV = [
  { key: "nav.men", href: "/shop?gender=MEN" },
  { key: "nav.women", href: "/shop?gender=WOMEN" },
  { key: "nav.kids", href: "/shop?gender=KIDS" },
  { key: "nav.footwear", href: "/shop?division=FOOTWEAR" },
  { key: "nav.apparel", href: "/shop?division=APPAREL" },
  { key: "nav.brands", href: "/shop" },
  { key: "nav.sale", href: "/shop" },
];

export async function SiteHeader() {
  const branding = await getBranding();
  const user = await getCurrentUser();
  const t = await getT();
  const announcements =
    branding.announcements.length > 0 ? branding.announcements : [branding.siteName];
  return (
    <header className="relative z-20 border-b border-ink bg-paper">
      {/* Announcement marquee — black bar at top, white text, Adidas style */}
      <div className="overflow-hidden bg-ink">
        <div className="relative flex h-8 items-center">
          <div className="marquee-track flex shrink-0 whitespace-nowrap">
            {[...announcements, ...announcements, ...announcements].map((text, i) => (
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
        {/* Wordmark — heavy sans lead with an italic-serif accent. */}
        <Link href="/" className="flex items-baseline gap-1 tracking-tight">
          <span className="font-display text-2xl">{branding.wordmarkLead}</span>
          <span className="font-display-italic text-2xl text-accent">{branding.wordmarkAccent}</span>
        </Link>

        {/* Center nav — ALL CAPS heavy sans, Adidas style */}
        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group relative py-2 text-[13px] font-bold uppercase tracking-wider text-ink transition-colors hover:text-accent"
            >
              {t(item.key)}
              <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-ink transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* Right tools */}
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LanguageSwitcher />
          <button
            type="button"
            aria-label={t("header.search")}
            className="hidden h-9 w-9 items-center justify-center text-ink transition-colors hover:text-accent sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" strokeLinecap="round" />
            </svg>
          </button>
          <Link
            href={user ? "/account" : "/login"}
            aria-label={user ? t("header.account") : t("header.signIn")}
            title={user ? t("header.account") : t("header.signIn")}
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
            key={item.key}
            href={item.href}
            className="shrink-0 text-xs font-bold uppercase tracking-wider text-ink hover:text-accent"
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
