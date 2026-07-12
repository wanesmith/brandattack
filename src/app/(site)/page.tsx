import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/ProductCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { getBranding } from "@/lib/settings";
import { getT } from "@/lib/i18n/server";
import {
  getAllProducts,
  getBiggestDiscounts,
  getCategoryHero,
  getJustInProducts,
  getProductIdsByImageUrls,
} from "@/lib/products";

export default async function Home() {
  const t = await getT();
  const [branding, all, justIn, lastChance, heroMen, heroWomen, heroKids, heroFootwear, heroApparel] =
    await Promise.all([
      getBranding(),
      getAllProducts(),
      getJustInProducts(8),
      getBiggestDiscounts(8),
      getCategoryHero("gender", "MEN"),
      getCategoryHero("gender", "WOMEN"),
      getCategoryHero("gender", "KIDS"),
      getCategoryHero("division", "FOOTWEAR"),
      getCategoryHero("division", "APPAREL"),
    ]);

  const { hero } = branding;
  // Hero carousel: use the admin-configured hero images if any; otherwise
  // auto-pick from the category heroes + a few product shots (deduped).
  const heroImages =
    hero.images.length > 0
      ? hero.images
      : Array.from(
          new Set(
            [
              heroFootwear?.url,
              heroMen?.url,
              heroWomen?.url,
              heroApparel?.url,
              heroKids?.url,
              ...all.slice(0, 6).map((p) => p.images[0]),
            ].filter((u): u is string => Boolean(u))
          )
        ).slice(0, 6);
  // Each hero slide links to the product it shows (custom uploads fall back to
  // the hero CTA / shop).
  const heroImageProducts = await getProductIdsByImageUrls(heroImages);
  const heroSlides = heroImages.map((url) => {
    const pid = heroImageProducts.get(url);
    return { url, href: pid ? `/p/${pid}` : hero.ctaHref || "/shop" };
  });

  // Hero copy is admin-editable (Homepage hero settings). When it's still the
  // built-in default, show the translated version; a custom admin headline is
  // shown as written (bespoke copy shouldn't be machine-translated). Defaults
  // mirror lib/settings.ts.
  const HERO_DEFAULTS = {
    eyebrow: "N. 01 · The Singapore Lot · 2026",
    heading: "Authentic Adidas.\nOutlet prices.",
    cta: "Shop the lot",
  };
  const heroEyebrow =
    hero.eyebrow === HERO_DEFAULTS.eyebrow ? t("home.heroEyebrow") : hero.eyebrow;
  const heroHeading =
    hero.heading === HERO_DEFAULTS.heading ? t("home.heroHeading") : hero.heading;
  const heroCta = hero.ctaLabel === HERO_DEFAULTS.cta ? t("home.shopCta") : hero.ctaLabel;
  const heroLines = heroHeading.split("\n").filter((l) => l.trim().length > 0);

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brandstoxx.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: branding.siteName,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.ico`,
      },
      {
        "@type": "WebSite",
        name: branding.siteName,
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/shop?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ========== FULL-BLEED HERO — Adidas signature ========== */}
      <section className="relative h-[min(85vh,820px)] w-full overflow-hidden bg-ink">
        <HeroCarousel slides={heroSlides} />
        {/* Gradient legibility wash — lets clicks fall through to the slide link */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />

        {/* Three-stripe decoration top-right */}
        <div className="pointer-events-none absolute right-8 top-8 stripes-3 lg text-paper/70">
          <span /><span /><span />
        </div>

        {/* Bottom-aligned content — clicks pass through except on the buttons */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-[1400px]">
            {hero.eyebrow && (
              <p className="reveal label-mono text-paper/70">{heroEyebrow}</p>
            )}
            <h1 className="reveal reveal-d1 mt-4 font-display text-[clamp(2.75rem,9vw,8.5rem)] text-paper">
              {heroLines.map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </h1>
            <div className="reveal reveal-d2 pointer-events-auto mt-8 flex flex-wrap items-center gap-5">
              <Link href={hero.ctaHref || "/shop"} className="btn-solid !bg-paper !text-ink !border-paper hover:!bg-accent hover:!text-paper hover:!border-accent">
                {heroCta}
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/about"
                className="text-sm font-bold uppercase tracking-wider text-paper/90 underline-offset-4 hover:text-paper hover:underline"
              >
                {t("home.heroHowItWorks")} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== STAT STRIP — under the hero, all-caps athletic ========== */}
      <section className="border-b border-ink bg-paper">
        <div className="mx-auto grid max-w-[1400px] grid-cols-3 divide-x divide-rule px-6">
          <Stat number="21,082" label={t("home.statUnits")} />
          <Stat number="2,290" label={t("home.statStyles")} />
          <Stat number="−60%" label={t("home.statAvgOff")} />
        </div>
      </section>

      {/* ========== SHOP BY CATEGORY — tighter Adidas-style grid ========== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:py-20">
          <header className="mb-8 flex items-end justify-between gap-6">
            <div>
              <div className="stripes-row text-ink mb-4">
                <span /><span /><span />
              </div>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl">
                {t("home.shopByCategory")}
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden text-sm font-bold uppercase tracking-wider text-ink underline-offset-4 hover:underline sm:block"
            >
              {t("home.viewAll")} →
            </Link>
          </header>

          {/* Adidas-style: 4 equal tiles in a row, square aspect */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <CategoryTile
              href="/shop?gender=MEN"
              title={t("nav.men")}
              imageUrl={heroMen?.url}
            />
            <CategoryTile
              href="/shop?gender=WOMEN"
              title={t("nav.women")}
              imageUrl={heroWomen?.url}
            />
            <CategoryTile
              href="/shop?gender=KIDS"
              title={t("nav.kids")}
              imageUrl={heroKids?.url}
            />
            <CategoryTile
              href="/shop?division=FOOTWEAR"
              title={t("nav.footwear")}
              imageUrl={heroFootwear?.url}
            />
          </div>
        </div>
      </section>

      {/* ========== JUST IN ========== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:py-20">
          <header className="mb-8 flex items-end justify-between">
            <div>
              <div className="stripes-row text-ink mb-4">
                <span /><span /><span />
              </div>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl">
                {t("home.justIn")}
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden text-sm font-bold uppercase tracking-wider text-ink underline-offset-4 hover:underline sm:block"
            >
              {t("home.viewAll")} →
            </Link>
          </header>

          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {justIn.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== FULL-BLEED EDITORIAL — Adidas-style image block with overlay ========== */}
      <section className="relative h-[min(70vh,640px)] w-full overflow-hidden bg-ink">
        {heroApparel?.url && (
          <Image
            src={heroApparel.url}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-85"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/30 to-transparent" />
        <div className="absolute right-8 top-8 stripes-3 lg text-paper/60">
          <span /><span /><span />
        </div>
        <div className="absolute inset-y-0 left-0 flex items-center px-6">
          <div className="mx-auto max-w-[1400px]">
            <p className="label-mono text-paper/70">{t("home.editorialEyebrow")}</p>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(2.5rem,7vw,6.5rem)] text-paper">
              {t("home.howDiscountWorks")}
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-paper/85">
              {t("home.discountBody")}
            </p>
            <Link
              href="/about"
              className="btn-outline mt-8 !text-paper !border-paper hover:!bg-paper hover:!text-ink"
            >
              {t("home.fullMethod")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========== LAST CHANCE ========== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:py-20">
          <header className="mb-8 flex items-end justify-between">
            <div>
              <div className="stripes-row text-accent mb-4">
                <span /><span /><span />
              </div>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl">
                {t("home.lastChance")}
              </h2>
              <p className="mt-3 max-w-md text-sm text-ink-soft">
                {t("home.lastChanceSub")}
              </p>
            </div>
            <Link
              href="/shop?sort=discount"
              className="hidden text-sm font-bold uppercase tracking-wider text-ink underline-offset-4 hover:underline sm:block"
            >
              {t("home.allSale")} →
            </Link>
          </header>

          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {lastChance.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link href="/shop" className="btn-solid">
              {t("home.seeAllStyles").replace("{count}", String(all.length))}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================ Pieces ============================ */

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="py-6 sm:py-8">
      <dt className="font-display text-3xl text-ink sm:text-5xl lg:text-6xl">{number}</dt>
      <dd className="label-mono-sm mt-2 text-ink-faded">{label}</dd>
    </div>
  );
}

function CategoryTile({
  href,
  title,
  imageUrl,
}: {
  href: string;
  title: string;
  imageUrl?: string;
}) {
  return (
    <Link href={href} className="group relative block aspect-square overflow-hidden bg-paper-warm">
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 640px) 25vw, 50vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 sm:p-6">
        <div className="font-display text-2xl text-paper sm:text-3xl lg:text-4xl">
          {title}
        </div>
        <div className="stripes-3 text-paper opacity-80 transition-opacity group-hover:opacity-100">
          <span /><span /><span />
        </div>
      </div>
      {/* Underline reveal */}
      <span className="absolute bottom-0 left-0 h-1 w-0 bg-accent transition-all duration-500 ease-out group-hover:w-full" />
    </Link>
  );
}
