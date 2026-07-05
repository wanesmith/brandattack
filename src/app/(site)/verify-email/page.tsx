import Link from "next/link";
import { consumeToken, markEmailVerified } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify email — Brand Stoxx" };

type SearchParams = Promise<{ token?: string }>;

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const { token = "" } = await searchParams;

  let ok = false;
  if (token) {
    const userId = await consumeToken(token, "verify_email");
    if (userId) {
      await markEmailVerified(userId);
      ok = true;
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center lg:py-24">
      {ok ? (
        <>
          <h1 className="font-display text-4xl">Email verified ✓</h1>
          <p className="mt-3 text-sm text-ink/60">
            Your account is fully active. You can now check out.
          </p>
          <Link
            href="/account"
            className="mt-8 inline-block rounded-sm bg-accent px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-paper hover:opacity-90"
          >
            Go to your account →
          </Link>
        </>
      ) : (
        <>
          <h1 className="font-display text-4xl">Link expired or invalid</h1>
          <p className="mt-3 text-sm text-ink/60">
            This verification link is no longer valid. Sign in and request a fresh one from your
            account page.
          </p>
          <Link
            href="/account"
            className="mt-8 inline-block rounded-sm bg-accent px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-paper hover:opacity-90"
          >
            Go to your account →
          </Link>
        </>
      )}
    </div>
  );
}
