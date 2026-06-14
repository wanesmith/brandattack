export const metadata = {
  title: "About — Brandattack",
  description: "How Brandattack sources authentic branded inventory at wholesale prices.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-16 prose-invert">
      <h1 className="text-4xl font-bold sm:text-5xl">How Brandattack works</h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        Brand names you know. Wholesale prices. Direct to your door.
      </p>

      <section className="mt-12 space-y-6 text-base leading-relaxed">
        <Block n="01" title="We buy whole pallets, direct">
          Major brands offload end-of-line, end-of-season, and market-seconds stock as
          wholesale lots. We buy these lots whole — sometimes thousands of units at a time —
          straight from the source.
        </Block>
        <Block n="02" title="It's authentic. Always.">
          Every item is genuine, brand-new, in original packaging where applicable. Market
          seconds means&nbsp;<em>last season</em> or <em>overstocked</em> — not damaged, not
          counterfeit. If anything has a minor cosmetic flaw, we say so and price accordingly.
        </Block>
        <Block n="03" title="The discount is real">
          Because we cut out the distributor markup, the regional reseller markup, and the
          retail margin, our prices are typically 50–70% under RRP. The savings aren't a
          marketing trick — they're the structure of the deal.
        </Block>
        <Block n="04" title="When it's gone, it's gone">
          Each lot is finite. We don't restock. If a size sells out, that's it — but new lots
          arrive regularly, so the catalogue keeps moving.
        </Block>
      </section>
    </article>
  );
}

function Block({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-[var(--accent)] pl-6">
      <div className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent)]">{n}</div>
      <h2 className="mt-1 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-[var(--muted)]">{children}</p>
    </div>
  );
}
