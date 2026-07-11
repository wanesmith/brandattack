import type { Metadata } from "next";
import { Instrument_Serif, Manrope, JetBrains_Mono } from "next/font/google";
import { getBranding } from "@/lib/settings";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

// Editorial display — Italian Sunday-supplement feel
const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

// Body — soft modern grotesque
const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Labels, SKU, price
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brandstoxx.com";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, tagline } = await getBranding();
  const title = `${siteName} — authentic branded closeouts at outlet prices`;
  const description =
    tagline || "Authentic branded footwear & apparel from authorised wholesale lots, shipped across Asia.";
  return {
    metadataBase: new URL(siteUrl),
    // Plain default title — child pages set their own full titles, so no
    // template (which would double them). Per-page canonicals are set on the
    // pages themselves (e.g. product pages), not globally.
    title,
    description,
    applicationName: siteName,
    keywords: [
      siteName,
      "Adidas",
      "outlet",
      "closeouts",
      "authentic sneakers",
      "branded apparel",
      "wholesale",
      "Asia shipping",
    ],
    openGraph: {
      title,
      description,
      type: "website",
      siteName,
      url: siteUrl,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${instrumentSerif.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
