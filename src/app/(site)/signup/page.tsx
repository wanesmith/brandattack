import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/customer-auth";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create an account — Brand Stoxx" };

type SearchParams = Promise<{ next?: string }>;

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const { next = "" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next || "/account");

  const safeNext = next.startsWith("/") ? next : "";

  return (
    <div className="mx-auto max-w-md px-6 py-16 lg:py-24">
      <h1 className="font-display text-4xl">Create your account</h1>
      <p className="mt-2 mb-8 text-sm text-ink/60">
        We&apos;ll email you a link to verify your address. You&apos;ll need a verified account to
        check out.
      </p>
      <SignupForm next={safeNext} />
    </div>
  );
}
