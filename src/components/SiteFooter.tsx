import Link from "next/link";
import { getBranding } from "@/lib/settings";

const COUNTRIES = [
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "ID", name: "Indonesia" },
  { code: "VN", name: "Vietnam" },
  { code: "PH", name: "Philippines" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
];

export async function SiteFooter() {
  const branding = await getBranding();
  return (
    <footer className="relative z-[2] mt-32 bg-ink-bg text-ink-bg-text">
      {/* Newsletter band */}
      <div className="border-b border-[var(--ink-bg-rule)]">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:py-20">
          <div className="grid items-end gap-10 lg:grid-cols-2">
            <div>
              <div className="label-mono-sm text-accent">N.01 / Stay in the loop</div>
              <h2 className="mt-3 font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
                Lots arrive on a{" "}
                <span className="font-display-italic">private list</span>{" "}
                — before they hit the site.
              </h2>
              <p className="mt-4 max-w-md text-sm text-[var(--ink-ghost)]">
                One short email when a new pallet lands. Sizes go fast; subscribers see them first.
              </p>
            </div>
            <form className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="name@email.com"
                className="flex-1 border border-[var(--ink-bg-rule)] bg-transparent px-4 py-3 font-sans text-sm text-ink-bg-text placeholder:text-[var(--ink-ghost)] focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="label-mono shrink-0 bg-accent px-6 py-3 text-paper transition-colors hover:bg-accent-deep"
              >
                Subscribe →
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="border-b border-[var(--ink-bg-rule)]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-[var(--ink-bg-rule)] lg:grid-cols-4">
          <TrustItem
            mark="01"
            title="Authentic Guarantee"
            desc="Every item sourced from authorised wholesale channels."
          />
          <TrustItem
            mark="02"
            title="Pan-Asia Shipping"
            desc="Hubs in Singapore. 3–8 days regional."
          />
          <TrustItem
            mark="03"
            title="14-Day Exchanges"
            desc="If the size doesn't fit, swap for one that does."
          />
          <TrustItem
            mark="04"
            title="When it's gone, it's gone"
            desc="Finite lots. No restocks. Move quick."
          />
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
              Brand names. Outlet prices. No middlemen between the source and your wardrobe.
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
            title="Shop"
            links={[
              ["Men", "/shop?gender=MEN"],
              ["Women", "/shop?gender=WOMEN"],
              ["Kids", "/shop?gender=KIDS"],
              ["Footwear", "/shop?division=FOOTWEAR"],
              ["Apparel", "/shop?division=APPAREL"],
              ["All", "/shop"],
            ]}
          />

          <FooterCol
            title="Customer"
            links={[
              ["Shipping", "/shipping"],
              ["Returns", "/shipping"],
              ["Size guide", "/shipping"],
              ["FAQ", "/shipping"],
              ["Contact", "/shipping"],
            ]}
          />

          <FooterCol
            title="Company"
            links={[
              ["About", "/about"],
              ["The lot", "/about"],
              ["Press", "/about"],
              ["Wholesale", "/about"],
            ]}
          />

          <div className="lg:col-span-2">
            <h3 className="label-mono mb-4 text-[var(--ink-ghost)]">Ship to</h3>
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
            <p className="label-mono-sm mt-3 text-[var(--ink-ghost)]">USD · ALL PRICES</p>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-[var(--ink-bg-rule)]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 px-6 py-6 text-xs text-[var(--ink-ghost)] sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} {branding.siteName}. Authentic resold goods. All trademarks property of their respective owners.</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/about" className="hover:text-paper">
              Terms
            </Link>
            <Link href="/about" className="hover:text-paper">
              Privacy
            </Link>
            <Link href="/about" className="hover:text-paper">
              Cookies
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
