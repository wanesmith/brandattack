import Link from "next/link";
import { getBranding } from "@/lib/settings";
import { getT } from "@/lib/i18n/server";
import { SHIP_TO_COUNTRIES as COUNTRIES } from "@/lib/countries";

export async function SiteFooter() {
  const branding = await getBranding();
  const t = await getT();
  return (
    <footer className="relative z-[2] mt-32 bg-ink-bg text-ink-bg-text">
      {/* Newsletter band */}
      <div className="border-b border-[var(--ink-bg-rule)]">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:py-20">
          <div className="grid items-end gap-10 lg:grid-cols-2">
            <div>
              <div className="label-mono-sm text-accent">{t("footer.newsletterEyebrow")}</div>
              <h2 className="mt-3 font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
                {t("footer.newsletterHeading")}
              </h2>
              <p className="mt-4 max-w-md text-sm text-[var(--ink-ghost)]">
                {t("footer.newsletterBody")}
              </p>
            </div>
            <form className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder={t("footer.emailPlaceholder")}
                className="flex-1 border border-[var(--ink-bg-rule)] bg-transparent px-4 py-3 font-sans text-sm text-ink-bg-text placeholder:text-[var(--ink-ghost)] focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="label-mono shrink-0 bg-accent px-6 py-3 text-paper transition-colors hover:bg-accent-deep"
              >
                {t("footer.subscribe")} →
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="border-b border-[var(--ink-bg-rule)]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-[var(--ink-bg-rule)] lg:grid-cols-4">
          <TrustItem mark="01" title={t("footer.trustAuthTitle")} desc={t("footer.trustAuthDesc")} />
          <TrustItem mark="02" title={t("footer.trustShipTitle")} desc={t("footer.trustShipDesc")} />
          <TrustItem mark="03" title={t("footer.trustExchTitle")} desc={t("footer.trustExchDesc")} />
          <TrustItem mark="04" title={t("footer.trustGoneTitle")} desc={t("footer.trustGoneDesc")} />
        </div>
      </div>

      {/* Main link grid */}
      <div className="mx-auto max-w-[1400px] px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Wordmark */}
          <div className="lg:col-span-4">
            <div className="font-display text-4xl leading-none">
              {branding.wordmarkLead}
              <span className="font-display-italic text-accent">{branding.wordmarkAccent}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-[var(--ink-ghost)]">
              {t("footer.tagline")}
            </p>
            {branding.supportEmail && (
              <a
                href={`mailto:${branding.supportEmail}`}
                className="mt-4 inline-block text-sm text-[var(--ink-ghost)] hover:text-paper"
              >
                {branding.supportEmail}
              </a>
            )}
            <p className="label-mono-sm mt-6 text-[var(--ink-ghost)]">
              EST. 2026 · SINGAPORE
            </p>
          </div>

          <FooterCol
            title={t("footer.colShop")}
            links={[
              [t("nav.men"), "/shop?gender=MEN"],
              [t("nav.women"), "/shop?gender=WOMEN"],
              [t("nav.kids"), "/shop?gender=KIDS"],
              [t("nav.footwear"), "/shop?division=FOOTWEAR"],
              [t("nav.apparel"), "/shop?division=APPAREL"],
              [t("nav.all"), "/shop"],
            ]}
          />

          <FooterCol
            title={t("footer.colCustomer")}
            links={[
              [t("footer.linkSupport"), "/support"],
              [t("footer.linkShipping"), "/shipping"],
              [t("footer.linkReturns"), "/shipping"],
              [t("footer.linkSizeGuide"), "/shipping"],
              [t("footer.linkFaq"), "/shipping"],
              [t("footer.linkContact"), "/contact"],
            ]}
          />

          <FooterCol
            title={t("footer.colCompany")}
            links={[
              [t("footer.linkAbout"), "/about"],
              [t("footer.linkTheLot"), "/about"],
              [t("footer.linkPress"), "/about"],
              [t("footer.linkWholesale"), "/about"],
            ]}
          />

          <div className="lg:col-span-2">
            <h3 className="label-mono mb-4 text-[var(--ink-ghost)]">{t("footer.shipTo")}</h3>
            <select
              defaultValue="SG"
              className="w-full cursor-pointer border border-[var(--ink-bg-rule)] bg-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider text-ink-bg-text focus:border-accent focus:outline-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-ink-bg text-ink-bg-text">
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
            <p className="label-mono-sm mt-3 text-[var(--ink-ghost)]">{t("footer.allPrices")}</p>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-[var(--ink-bg-rule)]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 px-6 py-6 text-xs text-[var(--ink-ghost)] sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} {branding.siteName}. {t("footer.rights")}</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/terms" className="hover:text-paper">
              {t("footer.terms")}
            </Link>
            <Link href="/about" className="hover:text-paper">
              {t("footer.privacy")}
            </Link>
            <Link href="/about" className="hover:text-paper">
              {t("footer.cookies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function TrustItem({ mark, title, desc }: { mark: string; title: string; desc: string }) {
  return (
    <div className="px-6 py-7 sm:px-8 sm:py-10">
      <div className="font-display-italic text-base text-accent">N. {mark}</div>
      <div className="mt-2 font-display text-xl leading-tight">{title}</div>
      <div className="mt-2 text-xs text-[var(--ink-ghost)]">{desc}</div>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="lg:col-span-2">
      <h3 className="label-mono mb-4 text-[var(--ink-ghost)]">{title}</h3>
      <ul className="space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link href={href} className="text-ink-bg-text transition-colors hover:text-accent">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
