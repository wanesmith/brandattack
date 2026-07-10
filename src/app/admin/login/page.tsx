import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, isValidSessionCookie } from "@/lib/admin-auth";
import { getBranding } from "@/lib/settings";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign in — Brand Stoxx admin",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const cookieStore = await cookies();
  if (isValidSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    redirect("/admin");
  }

  const { error } = await searchParams;
  const branding = await getBranding();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl tracking-tight">
            {branding.wordmarkLead}
            <span className="font-display-italic text-accent">{branding.wordmarkAccent}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--muted)]">
            Admin console
          </div>
        </div>
        <LoginForm initialError={error ?? null} />
      </div>
    </div>
  );
}
