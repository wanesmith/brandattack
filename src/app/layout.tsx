import type { Metadata } from "next";
import { Instrument_Serif, Manrope, JetBrains_Mono } from "next/font/google";
import { getBranding } from "@/lib/settings";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://brandattack.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, tagline } = await getBranding();
  return {
    metadataBase: new URL(siteUrl),
    title: `${siteName} — branded closeouts, sea-freighted`,
    description: tagline,
    openGraph: {
      title: siteName,
      description: tagline,
      type: "website",
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
