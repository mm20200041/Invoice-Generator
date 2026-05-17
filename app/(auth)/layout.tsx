import Link from "next/link";
import { IconFileInvoice, IconShieldCheck, IconBolt, IconWorld } from "@tabler/icons-react";

/**
 * Split-screen auth layout (answer 8B).
 * On mobile, the marketing panel is hidden.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form panel ------------------------------------------------------- */}
      <div className="flex flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-heading text-sm font-semibold"
          >
            <IconFileInvoice className="size-5 text-primary" />
            Invoice Generator
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="px-6 pb-6 text-xs text-muted-foreground sm:px-10">
          &copy; {new Date().getFullYear()} Invoice Generator
        </footer>
      </div>

      {/* Marketing panel -------------------------------------------------- */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 size-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium ring-1 ring-foreground/10">
            <IconBolt className="size-3.5 text-primary" />
            Built for freelancers
          </span>
          <h2 className="mt-6 max-w-md font-heading text-3xl leading-tight font-medium tracking-tight">
            Send polished invoices and get paid faster.
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Manage clients, generate clean PDF invoices, attach a one-click
            payment link, and track what&apos;s paid &mdash; all from one place.
          </p>
        </div>

        <ul className="relative grid gap-4 text-sm">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10">
              <IconFileInvoice className="size-4 text-primary" />
            </span>
            <div>
              <p className="font-medium">PDF invoices, generated for you</p>
              <p className="text-muted-foreground">
                A clean layout, ready to send in one click.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10">
              <IconWorld className="size-4 text-primary" />
            </span>
            <div>
              <p className="font-medium">Stripe-powered payment links</p>
              <p className="text-muted-foreground">
                Get paid online &mdash; auto-marks the invoice as paid.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10">
              <IconShieldCheck className="size-4 text-primary" />
            </span>
            <div>
              <p className="font-medium">Your data, only yours</p>
              <p className="text-muted-foreground">
                Per-row security policies on every table.
              </p>
            </div>
          </li>
        </ul>
      </aside>
    </div>
  );
}
