import { getBranding } from "@/lib/settings";

export const metadata = {
  title: "Terms & Conditions — Brand Stoxx",
  description:
    "The terms governing purchases from Brand Stoxx: products, pricing, payment, shipping, returns, refunds, and contact.",
};

const EFFECTIVE_DATE = "11 July 2026";

export default async function TermsPage() {
  const branding = await getBranding();
  const site = branding.siteName || "Brand Stoxx";
  const email = branding.supportEmail || "support@brand-stoxx.com";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://brandattack.vercel.app").replace(
    /\/$/,
    ""
  );

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <p className="label-mono text-ink-faded">Legal</p>
      <h1 className="mt-4 font-display text-5xl leading-[0.95] sm:text-6xl">
        Terms &amp; <span className="font-display-italic">Conditions</span>
      </h1>
      <p className="mt-6 text-sm text-ink-faded">Last updated: {EFFECTIVE_DATE}</p>

      <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-ink-soft">
        <p>
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of{" "}
          {siteUrl} (the &ldquo;Site&rdquo;) and any purchase you make from {site} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;, &ldquo;our&rdquo;). By browsing the Site, creating an account, or placing
          an order, you agree to these Terms. If you do not agree, please do not use the Site.
        </p>

        <Section n="1" title="Who we are">
          <p>
            {site} is an online retailer of authentic, brand-name apparel and footwear sourced from
            authorised wholesale and liquidation channels. We operate primarily from Singapore and
            ship to selected markets across Asia. For any questions about these Terms or your order,
            contact us at{" "}
            <a href={`mailto:${email}`} className="text-ink underline underline-offset-2 hover:text-accent">
              {email}
            </a>
            .
          </p>
        </Section>

        <Section n="2" title="Products & authenticity">
          <p>
            We sell genuine branded merchandise obtained through legitimate wholesale channels. All
            trademarks, brand names, and logos are the property of their respective owners; their
            appearance on the Site is solely to describe the goods offered for sale and does not
            imply any affiliation with or endorsement by the brand owners. Stock consists of
            end-of-line, overstock, and closeout lots in finite quantities. Products are described
            and photographed as accurately as possible; minor variations in colour or packaging may
            occur, and sizes and stock are limited and not restocked.
          </p>
        </Section>

        <Section n="3" title="Pricing & currency">
          <p>
            All prices are listed and charged in United States Dollars (USD) unless stated otherwise.
            Prices are inclusive of the item cost only; shipping, taxes, import duties, and customs
            charges are shown or calculated separately at checkout or payable on delivery as noted in
            Section&nbsp;7. We reserve the right to correct pricing errors and to change prices at any
            time before you place an order. The price applicable to your order is the price displayed
            at the time your order is confirmed.
          </p>
        </Section>

        <Section n="4" title="Orders & acceptance">
          <p>
            Your order is an offer to purchase. After you place an order you will receive an
            acknowledgement; this confirms receipt, not acceptance. A contract is formed only when we
            confirm dispatch of the goods. We may decline or cancel an order — for example if an item
            is out of stock, if there was a pricing or description error, or if we suspect fraud — in
            which case we will not charge you, or will refund any amount already charged.
          </p>
        </Section>

        <Section n="5" title="Payment">
          <p>
            Payments are processed securely by <strong>Stripe</strong>. We accept the payment methods
            shown at checkout (including major credit and debit cards). We do not store your full card
            details; card data is transmitted directly to and handled by Stripe under its own terms
            and security standards. By paying, you confirm that you are authorised to use the payment
            method provided. Your order is charged at the time of purchase.
          </p>
        </Section>

        <Section n="6" title="Shipping & delivery">
          <p>
            We currently ship to Singapore, Malaysia, Thailand, Indonesia, Vietnam, the Philippines,
            Hong Kong, Taiwan, Japan, and South Korea. Estimated transit is typically 3–8 business
            days within the region after dispatch; delivery times are estimates and not guaranteed.
            Every order ships with a tracking number emailed at dispatch. Risk of loss passes to you
            on delivery. If an order is lost or damaged in transit, contact us and we will work with
            the carrier to resolve it.
          </p>
        </Section>

        <Section n="7" title="Customs, duties & taxes">
          <p>
            For cross-border shipments, import duties, taxes, and customs fees may be levied by the
            destination country and are the responsibility of the customer, payable at or before
            delivery unless expressly stated as included at checkout. We provide accurate commercial
            invoices and cannot mark shipments as gifts or under-declare their value.
          </p>
        </Section>

        <Section n="8" title="Returns, exchanges & refunds">
          <p>
            We want you to be satisfied with your purchase. Our policy is:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Size exchanges:</strong> unworn items in original condition and packaging may be
              exchanged for a different available size within <strong>14 days</strong> of delivery.
            </li>
            <li>
              <strong>Faulty or incorrect items:</strong> if an item arrives defective, damaged, or
              not as described, contact us within <strong>14 days</strong> of delivery for a
              replacement or a full refund, including return shipping where applicable.
            </li>
            <li>
              <strong>Change of mind:</strong> because stock is sold at closeout pricing in limited
              quantities, general change-of-mind returns may not be accepted; where offered, the item
              must be unworn, in original condition, and return shipping is the customer&rsquo;s
              responsibility.
            </li>
            <li>
              <strong>Refunds</strong> are issued to the original payment method via Stripe, normally
              within 5–10 business days of us receiving and inspecting the returned item. Original
              shipping charges are non-refundable except where the item was faulty or incorrect.
            </li>
          </ul>
          <p className="mt-3">
            To start a return or exchange, email{" "}
            <a href={`mailto:${email}`} className="text-ink underline underline-offset-2 hover:text-accent">
              {email}
            </a>{" "}
            with your order number. Do not send items back without contacting us first.
          </p>
        </Section>

        <Section n="9" title="Cancellations">
          <p>
            If you need to cancel an order, contact us as soon as possible. We can usually cancel and
            fully refund an order that has not yet been dispatched. Once an order has shipped, the
            returns and refunds policy in Section&nbsp;8 applies.
          </p>
        </Section>

        <Section n="10" title="Accounts">
          <p>
            You are responsible for keeping your account credentials confidential and for all activity
            under your account. You must provide accurate, current information and a valid delivery
            address. Notify us immediately of any unauthorised use of your account.
          </p>
        </Section>

        <Section n="11" title="Acceptable use">
          <p>
            You agree not to use the Site for any unlawful or fraudulent purpose, not to interfere
            with its operation or security, and not to resell or misrepresent our products in a way
            that infringes any third party&rsquo;s rights. We may suspend or terminate access for
            breach of these Terms.
          </p>
        </Section>

        <Section n="12" title="Intellectual property">
          <p>
            The Site&rsquo;s design, text, and graphics (excluding third-party brand marks, which
            belong to their owners) are owned by or licensed to {site} and may not be copied or reused
            without permission.
          </p>
        </Section>

        <Section n="13" title="Disclaimers & limitation of liability">
          <p>
            The Site and products are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
            basis. To the fullest extent permitted by law, we exclude implied warranties not expressly
            stated here, and our total liability arising out of any order is limited to the amount you
            paid for that order. Nothing in these Terms limits liability that cannot be limited by
            law, including for death or personal injury caused by negligence, or for fraud. This does
            not affect any statutory consumer rights you may have.
          </p>
        </Section>

        <Section n="14" title="Privacy">
          <p>
            We process personal data (such as your name, contact details, and delivery address) to
            fulfil orders and provide support. Payment information is handled by Stripe. We do not sell
            your personal data. For privacy questions, contact us at{" "}
            <a href={`mailto:${email}`} className="text-ink underline underline-offset-2 hover:text-accent">
              {email}
            </a>
            .
          </p>
        </Section>

        <Section n="15" title="Governing law">
          <p>
            These Terms are governed by the laws of Singapore, and any dispute will be subject to the
            exclusive jurisdiction of the courts of Singapore, without affecting any mandatory consumer
            protections available to you in your country of residence.
          </p>
        </Section>

        <Section n="16" title="Changes to these Terms">
          <p>
            We may update these Terms from time to time. The version in effect at the time you place an
            order governs that purchase. The &ldquo;Last updated&rdquo; date above reflects the current
            version.
          </p>
        </Section>

        <Section n="17" title="Contact">
          <p>
            Questions about these Terms, an order, a return, or a refund? Email{" "}
            <a href={`mailto:${email}`} className="text-ink underline underline-offset-2 hover:text-accent">
              {email}
            </a>
            . We aim to respond within 2 business days.
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl">
        <span className="text-ink-faded">{n}.</span> {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
