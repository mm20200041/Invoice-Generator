import Link from "next/link";
import { IconMailCheck } from "@tabler/icons-react";

import { ResendConfirmationButton } from "./resend-confirmation-button";

export const metadata = {
  title: "Check your email — Invoice Generator",
};

type SearchParams = Promise<{ email?: string }>;

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { email } = await searchParams;

  return (
    <div className="grid gap-8">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
        <IconMailCheck className="size-6 text-primary" />
      </div>

      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground">
          {email ? (
            <>
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click it to activate your account and sign in.
            </>
          ) : (
            <>
              We sent you a confirmation link. Click it to activate your
              account and sign in.
            </>
          )}
        </p>
      </div>

      {email ? <ResendConfirmationButton email={email} /> : null}

      <p className="text-center text-sm text-muted-foreground">
        Wrong email?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Start over
        </Link>
      </p>
    </div>
  );
}
