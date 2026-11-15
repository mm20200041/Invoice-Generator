import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconFileInvoice,
  IconMail,
  IconShieldCheck,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

/**
 * Marketing landing page. If the visitor is already signed in, bounce them
 * straight to the dashboard.
 */
export default async function Home() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex flex-1 flex-col bg-background">
      {/* gradient blobs */}
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-heading text-sm font-semibold"
        >
          <IconFileInvoice className="size-5 text-primary" />
          Invoice Generator
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-16 px-6 py-16 text-center">
        <div className="grid max-w-2xl gap-6">
          <h1 className="font-heading text-4xl font-medium tracking-tight sm:text-5xl">
            Send polished invoices.
            <br className="hidden sm:block" /> Get paid faster.
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            A focused invoicing tool for freelancers. Manage clients, generate
            clean PDFs, email them in one click, and track every invoice as
            paid or unpaid &mdash; all from one place.
          </p>
          <div className="mx-auto flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Create your account
                <IconArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </div>

        <ul className="grid w-full max-w-4xl gap-6 text-left sm:grid-cols-3">
          <li className="grid gap-2 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <IconFileInvoice className="size-5 text-primary" />
            <p className="font-medium">PDF invoices, ready to send</p>
            <p className="text-sm text-muted-foreground">
              A clean fixed layout that prints beautifully every time.
            </p>
          </li>
          <li className="grid gap-2 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <IconMail className="size-5 text-primary" />
            <p className="font-medium">Email in one click</p>
            <p className="text-sm text-muted-foreground">
              Send the PDF to your client and mark invoices paid when you get paid.
            </p>
          </li>
          <li className="grid gap-2 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <IconShieldCheck className="size-5 text-primary" />
            <p className="font-medium">Your data, only yours</p>
            <p className="text-sm text-muted-foreground">
              Per-row security policies on every table in the database.
            </p>
          </li>
        </ul>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-6 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Invoice Generator
      </footer>
    </div>
  );
}
