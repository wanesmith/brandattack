import { getBranding } from "@/lib/settings";
import { SupportForm } from "./SupportForm";

export const metadata = {
  title: "Support — Brand Stoxx",
  description: "Contact Brand Stoxx support about orders, sizing, shipping, returns, or anything else.",
  alternates: { canonical: "/support" },
};

export default async function SupportPage() {
  const { supportEmail } = await getBranding();
  return (
    <div className="mx-auto max-w-xl px-6 py-16 lg:py-24">
      <p className="label-mono text-ink-faded">Help</p>
      <h1 className="mt-4 font-display text-5xl leading-[0.95] sm:text-6xl">Support</h1>
      <p className="mt-5 text-sm leading-relaxed text-ink-soft">
        Questions about an order, sizing, shipping, or a return? Send us a message and we&apos;ll
        get back to you.
        {supportEmail ? (
          <>
            {" "}Or email{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="text-ink underline underline-offset-2 hover:text-accent"
            >
              {supportEmail}
            </a>{" "}
            directly.
          </>
        ) : null}
      </p>
      <SupportForm />
    </div>
  );
}
