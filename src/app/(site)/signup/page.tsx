import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/customer-auth";
import { getStoreControls } from "@/lib/settings";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create an account — Brand Stoxx" };

type SearchParams = Promise<{ next?: string }>;

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const { next = "" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next || "/account");

  const { signupsEnabled } = await getStoreControls();
  const safeNext = next.startsWith("/") ? next : "";

  if (!signupsEnabled) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 lg:py-24">
        <h1 className="font-display text-4xl">Signups are closed</h1>
        <p className="mt-2 text-sm text-ink/60">
          New account registration is paused right now. You can still browse the store, and existing
          customers can{" "}
          <Link href="/login" className="text-accent underline underline-offset-2">
            sign in
          </Link>
          .
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-block rounded-sm bg-accent px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black hover:opacity-90"
        >
          Browse the shop →
        </Link>
      </div>
    );
  }

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
