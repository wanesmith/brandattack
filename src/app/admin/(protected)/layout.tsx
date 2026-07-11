import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, isValidSessionCookie } from "@/lib/admin-auth";
import { getBranding } from "@/lib/settings";
import { LogoutButton } from "./LogoutButton";

export const metadata = {
  title: "Admin — Brand Stoxx",
  robots: { index: false, follow: false },
};

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidSessionCookie(sessionCookie)) {
    redirect("/admin/login");
  }

  const branding = await getBranding();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 w-56 border-r border-[var(--border)] bg-[var(--surface)] p-5">
        <Link href="/admin" className="font-display text-xl tracking-tight">
          {branding.wordmarkLead}
          <span className="font-display-italic text-accent">{branding.wordmarkAccent}</span>
          <div className="mt-1 font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-[var(--muted)]">
            Admin console
          </div>
        </Link>
        <nav className="mt-8 space-y-1 text-sm">
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/import">Import lot</NavLink>
          <NavLink href="/admin/products">Products</NavLink>
          <NavLink href="/admin/filters">Filters</NavLink>
          <NavLink href="/admin/orders">Orders</NavLink>
          <NavLink href="/admin/users">Customers</NavLink>
          <NavLink href="/admin/abandoned-carts">Abandoned carts</NavLink>
          <NavLink href="/admin/translations">Translations</NavLink>
          <NavLink href="/admin/settings">Settings</NavLink>
        </nav>
        <div className="absolute bottom-5 left-5 right-5 space-y-2">
          <Link
            href="/"
            className="block text-xs text-[var(--muted)] hover:text-[var(--accent)]"
          >
            ← Back to storefront
          </Link>
          <LogoutButton />
        </div>
      </aside>
      <main className="ml-56 p-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded px-3 py-2 text-foreground transition-colors hover:bg-[var(--background)] hover:text-[var(--accent)]"
    >
      {children}
    </Link>
  );
}
