import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brandattack.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Brandattack — branded closeouts at impossible prices",
  description:
    "Brandattack stocks branded apparel, footwear and gear at deep discounts. Limited runs, current-season releases, shipped across Asia.",
  openGraph: {
    title: "Brandattack",
    description: "Branded closeouts. Wholesale prices. Shipped across Asia.",
    type: "website",
  },
};

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          BRAND<span className="text-[var(--accent)]">ATTACK</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/shop" className="hover:text-[var(--accent)]">Shop</Link>
          <Link href="/shop?division=FOOTWEAR" className="hidden hover:text-[var(--accent)] sm:inline">Footwear</Link>
          <Link href="/shop?division=APPAREL" className="hidden hover:text-[var(--accent)] sm:inline">Apparel</Link>
          <Link href="/about" className="hover:text-[var(--accent)]">About</Link>
          <Link href="/shipping" className="hidden hover:text-[var(--accent)] sm:inline">Shipping</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-mono text-base font-bold">
            BRAND<span className="text-[var(--accent)]">ATTACK</span>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Branded closeouts, market seconds, end-of-line stock — at prices that hurt the middleman.
          </p>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold uppercase tracking-wider">Shop</div>
          <ul className="space-y-1 text-sm text-[var(--muted)]">
            <li><Link href="/shop?division=FOOTWEAR" className="hover:text-foreground">Footwear</Link></li>
            <li><Link href="/shop?division=APPAREL" className="hover:text-foreground">Apparel</Link></li>
            <li><Link href="/shop?gender=KIDS" className="hover:text-foreground">Kids</Link></li>
            <li><Link href="/shop" className="hover:text-foreground">Everything</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold uppercase tracking-wider">Support</div>
          <ul className="space-y-1 text-sm text-[var(--muted)]">
            <li><Link href="/shipping" className="hover:text-foreground">Shipping</Link></li>
            <li><Link href="/about" className="hover:text-foreground">About</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold uppercase tracking-wider">Legal</div>
          <ul className="space-y-1 text-sm text-[var(--muted)]">
            <li>© {new Date().getFullYear()} Brandattack</li>
            <li className="text-xs">
              All brand names and logos are property of their respective owners. Brandattack is an independent reseller.
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
