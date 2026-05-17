import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Reset your password — Invoice Generator",
};

export default function ForgotPasswordPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
