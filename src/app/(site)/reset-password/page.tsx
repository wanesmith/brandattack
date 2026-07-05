import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Set a new password — Brand Stoxx" };

type SearchParams = Promise<{ token?: string }>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const { token = "" } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-6 py-16 lg:py-24">
      <h1 className="font-display text-4xl">Set a new password</h1>
      <p className="mt-2 mb-8 text-sm text-ink/60">Choose a new password for your account.</p>
      <ResetPasswordForm token={token} />
    </div>
  );
}
