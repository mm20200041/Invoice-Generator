import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in — Invoice Generator",
};

type SearchParams = Promise<{
  next?: string;
  error?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your invoices and clients.
        </p>
      </div>

      <LoginForm next={next} initialError={error} />

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
