export const metadata = {
  title: "Shipping — Brand Stoxx",
  description: "Brand Stoxx ships across Asia. Rates, transit times, and customs handling.",
};

const ROWS: [string, string][] = [
  ["Hubs", "Singapore (primary). More locations being qualified."],
  ["Coverage", "SG · MY · TH · ID · VN · PH · HK · TW · JP · KR. More markets being added."],
  ["Transit", "3–8 business days regional. Outer islands may be longer."],
  ["Tracking", "Every order ships with a tracking number, emailed at dispatch."],
  ["Customs", "Import duties paid by the customer at delivery. Accurate commercial invoices provided."],
  ["Returns", "14-day size exchanges. Closeout pricing means no change-of-mind returns. Defects refunded or replaced."],
];

export default function ShippingPage() {
  return (
    <article>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:py-28">
          <p className="label-mono text-ink-faded">N. 01 / Logistics</p>
          <h1 className="mt-5 font-display text-[clamp(3rem,8vw,7rem)] leading-[0.95] tracking-tight">
            Shipped from <span className="font-display-italic">Singapore.</span>
            <br />
            Across Asia.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
            Rates and transit shown at checkout. Free shipping on orders over $150 USD.
          </p>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="label-mono text-ink-faded">N. 02 / The detail</p>
              <h2 className="mt-2 font-display text-4xl sm:text-5xl">
                The <span className="font-display-italic">essentials.</span>
              </h2>
            </div>
            <div className="lg:col-span-8">
              <dl className="border-t border-rule">
                {ROWS.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-1 gap-2 border-b border-rule py-6 sm:grid-cols-[200px_1fr] sm:gap-8"
                  >
                    <dt className="label-mono text-ink-faded">{label}</dt>
                    <dd className="text-base leading-relaxed text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-10 max-w-md text-xs text-ink-faded">
                Logistics policy is being finalised market-by-market. If your country isn&apos;t
                listed, drop us a line — we&apos;re likely working on it.
              </p>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
