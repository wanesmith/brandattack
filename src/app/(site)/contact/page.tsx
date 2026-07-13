import { getBranding } from "@/lib/settings";
import { SupportForm } from "../support/SupportForm";

export const metadata = {
  title: "Contact Us — Brand Stoxx",
  description: "Get in touch with Brand Stoxx about wholesale, partnerships, press, or general enquiries.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const { infoEmail } = await getBranding();
  return (
    <div className="mx-auto max-w-xl px-6 py-16 lg:py-24">
      <p className="label-mono text-ink-faded">Info</p>
      <h1 className="mt-4 font-display text-5xl leading-[0.95] sm:text-6xl">Contact Us</h1>
      <p className="mt-5 text-sm leading-relaxed text-ink-soft">
        General enquiries — wholesale, partnerships, press, or anything else. Send us a message and
        we&apos;ll get back to you.
        {infoEmail ? (
          <>
            {" "}Or email{" "}
            <a
              href={`mailto:${infoEmail}`}
              className="text-ink underline underline-offset-2 hover:text-accent"
            >
              {infoEmail}
            </a>{" "}
            directly.
          </>
        ) : null}
      </p>
      <SupportForm kind="contact" />
    </div>
  );
}
