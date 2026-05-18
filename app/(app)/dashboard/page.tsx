import { cookies } from "next/headers";
import Link from "next/link";
import {
  IconFileInvoice,
  IconUsers,
  IconCreditCard,
  IconArrowRight,
} from "@tabler/icons-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileCompletionBanner } from "@/components/app-shell/profile-completion-banner";
import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/lib/db/profiles";

export const metadata = {
  title: "Dashboard — Invoice Generator",
};

export default async function DashboardPage() {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive: the (app) layout already redirects unauthenticated users.
  const profile = user ? await getProfile(supabase, user.id) : null;
  const profileIncomplete =
    !!profile && !profile.full_name && !profile.company_name;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8">
      {profileIncomplete && <ProfileCompletionBanner />}

      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{user?.email}</span>.
          Authentication is wired up — invoice features are next.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <IconFileInvoice className="size-5 text-primary" />
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              Create, send, and track your invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open invoices
              <IconArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <IconUsers className="size-5 text-primary" />
            <CardTitle>Clients</CardTitle>
            <CardDescription>
              Manage the people you send invoices to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/clients"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Manage clients
              <IconArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <IconCreditCard className="size-5 text-primary" />
            <CardTitle>Payments</CardTitle>
            <CardDescription>
              Connect Stripe to accept online payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/payments"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Set up payments
              <IconArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
