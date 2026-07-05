import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/customer-auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in — Brand Stoxx" };

type SearchParams = Promise<{ next?: string; reason?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next = "", reason } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next || "/account");

  // Only allow relative redirect targets.
  const safeNext = next.startsWith("/") ? next : "";

  return (
    <div className="mx-auto max-w-md px-6 py-16 lg:py-24">
      <h1 className="font-display text-4xl">Sign in</h1>
      {reason === "checkout" && (
        <p className="mt-3 rounded-sm bg-accent/10 px-3 py-2 text-sm text-ink">
          Please sign in to complete your checkout.
        </p>
      )}
      <p className="mt-2 mb-8 text-sm text-ink/60">
        Welcome back. Sign in to your account to check out and track orders.
      </p>
      <LoginForm next={safeNext} />
    </div>
  );
}
