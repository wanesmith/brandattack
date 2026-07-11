import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { CartSync } from "@/components/CartSync";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { getMaintenance } from "@/lib/settings";
import { ADMIN_COOKIE_NAME, isValidSessionCookie } from "@/lib/admin-auth";

// Storefront chrome. Lives in the (site) route group so it wraps only the
// public-facing pages — the admin console (and /admin/login) render without
// the site header, footer, or cart drawer.
export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const maintenance = await getMaintenance();
  const locale = await getLocale();
  const messages = await getMessages(locale);

  if (maintenance.enabled) {
    const store = await cookies();
    const isAdmin = isValidSessionCookie(store.get(ADMIN_COOKIE_NAME)?.value);
    if (!isAdmin) {
      // Redirect (not render) so no storefront/page data is sent to visitors.
      redirect("/maintenance");
    }
    // Signed-in admins see the live site with a preview banner.
    return (
      <LocaleProvider locale={locale} messages={messages}>
        <AdminPreviewBanner />
        <SiteHeader />
        <main className="relative z-[2] flex-1">{children}</main>
        <SiteFooter />
        <CartDrawer />
        <CartSync />
      </LocaleProvider>
    );
  }

  return (
    <LocaleProvider locale={locale} messages={messages}>
      <SiteHeader />
      <main className="relative z-[2] flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <CartSync />
    </LocaleProvider>
  );
}

function AdminPreviewBanner() {
  return (
    <div className="relative z-[60] flex items-center justify-center gap-3 bg-accent px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-paper">
      <span>Maintenance mode is ON — only you (admin) can see the storefront.</span>
      <Link href="/admin/settings" className="underline underline-offset-2">
        Turn off
      </Link>
    </div>
  );
}
