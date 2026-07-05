import { CartDrawer } from "@/components/CartDrawer";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// Storefront chrome. Lives in the (site) route group so it wraps only the
// public-facing pages — the admin console (and /admin/login) render without
// the site header, footer, or cart drawer.
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader />
      <main className="relative z-[2] flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
    </>
  );
}
