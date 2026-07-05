import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Reset password — Brand Stoxx" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 lg:py-24">
      <h1 className="font-display text-4xl">Forgot password</h1>
      <p className="mt-2 mb-8 text-sm text-ink/60">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
