export const metadata = {
  title: "Shipping — Brandattack",
  description: "Brandattack ships across Asia. Rates, transit times, and customs handling.",
};

export default function ShippingPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-4xl font-bold sm:text-5xl">Shipping</h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        We ship from regional warehouses across Asia. Rates and transit shown at checkout.
      </p>

      <section className="mt-10 space-y-6 text-base leading-relaxed">
        <Row label="Coverage" value="Singapore, Malaysia, Thailand, Indonesia, Vietnam, Philippines, Hong Kong. More markets being added." />
        <Row label="Transit" value="3–8 business days regional · longer for remote areas" />
        <Row label="Tracking" value="Every order ships with a tracking number, emailed once dispatch is confirmed." />
        <Row label="Customs & duties" value="Where applicable, import duties are paid by the customer at delivery. Brandattack provides accurate commercial invoices." />
        <Row label="Returns" value="Sized items can be exchanged within 14 days if the size doesn't fit. Closeout pricing means we cannot accept returns for change of mind." />
      </section>

      <p className="mt-12 text-sm text-[var(--muted)]">
        This page is a demo placeholder — full shipping policy will be finalised before launch.
      </p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-[var(--border)] pb-6 sm:grid-cols-[160px_1fr] sm:gap-6">
      <div className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}
