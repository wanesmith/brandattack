import { redirect } from "next/navigation";
import { getBranding, getMaintenance } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Back soon",
  robots: { index: false, follow: false },
};

// Standalone maintenance page — lives OUTSIDE the (site) group so it isn't
// gated by the storefront layout (no redirect loop) and ships no shop data.
export default async function MaintenancePage() {
  const maintenance = await getMaintenance();
  // If we're not actually in maintenance, don't strand visitors here.
  if (!maintenance.enabled) redirect("/");

  const branding = await getBranding();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center text-ink">
      <div className="flex items-baseline gap-1 tracking-tight">
        <span className="font-display text-3xl">{branding.wordmarkLead}</span>
        <span className="font-display-italic text-3xl text-accent">{branding.wordmarkAccent}</span>
      </div>
      <div className="stripes-row mt-8 text-ink" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <h1 className="mt-8 font-display text-4xl sm:text-5xl">Back soon</h1>
      <p className="mt-4 max-w-md text-sm text-ink/60">{maintenance.message}</p>
    </main>
  );
}
