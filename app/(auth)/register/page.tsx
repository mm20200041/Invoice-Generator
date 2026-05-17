import Link from "next/link";

import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Create your account — Invoice Generator",
};

export default function RegisterPage() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start sending invoices in minutes. Email confirmation required.
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
