export const metadata = {
  title: "About — Brandattack",
  description: "How Brandattack sources authentic branded inventory at wholesale prices.",
};

const CHAPTERS = [
  {
    n: "01",
    title: "We buy whole pallets, direct.",
    body:
      "Major brands offload end-of-line and end-of-season inventory as wholesale lots — sometimes thousands of units at a time. We buy whole, from authorised wholesale channels, with no middlemen.",
  },
  {
    n: "02",
    title: "It's authentic. Always.",
    body:
      "Every item is genuine, brand-new, in original packaging where applicable. \"Market seconds\" means last-season or overstocked — not damaged, not counterfeit. Any minor cosmetic flaw is disclosed and priced accordingly.",
  },
  {
    n: "03",
    title: "The discount is structural.",
    body:
      "Cut out the regional distributor, the local reseller, and the retail margin. What remains is the warehouse price, plus a thin operating margin. Prices are typically 50–70% under RRP — that's the structure, not a marketing claim.",
  },
  {
    n: "04",
    title: "When it's gone, it's gone.",
    body:
      "Each lot is finite. We don't restock the same SKU. New lots arrive every few months — different brands, different seasons, different stories. If a size sells out, that's it.",
  },
];

export default function AboutPage() {
  return (
    <article>
      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:py-32">
          <p className="label-mono text-ink-faded">N. 01 / The method</p>
          <h1 className="mt-5 font-display text-[clamp(3rem,8vw,8rem)] leading-[0.95] tracking-tight">
            Brand names.
            <br />
            <span className="font-display-italic">Outlet prices.</span>
            <br />
            No middlemen.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
            We move authentic end-of-line and market-seconds inventory direct from wholesale lots to
            your wardrobe — typically 50–70% under RRP. Limited stock, no restocks.
          </p>
        </div>
      </section>

      {/* Chapters */}
      <section className="border-b border-rule bg-paper-warm">
        <div className="mx-auto max-w-[1400px] px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <p className="label-mono text-ink-faded">N. 02 / How it works</p>
              <h2 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
                A simple <span className="font-display-italic">structural</span> arbitrage.
              </h2>
            </div>
            <div className="lg:col-span-8">
              <ol className="space-y-0 border-t border-rule">
                {CHAPTERS.map((c) => (
                  <li
                    key={c.n}
                    className="grid gap-6 border-b border-rule py-10 sm:grid-cols-[80px_1fr] sm:gap-10"
                  >
                    <div className="font-display-italic text-2xl text-accent">N. {c.n}</div>
                    <div>
                      <h3 className="font-display text-2xl leading-snug sm:text-3xl">
                        {c.title}
                      </h3>
                      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
                        {c.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
