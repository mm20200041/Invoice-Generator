import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { Header } from "@/components/app-shell/header";
import { Sidebar } from "@/components/app-shell/sidebar";

/**
 * Protected shell for everything under the (app) route group.
 *
 * Defense-in-depth (answer 5C): the root `proxy.ts` already redirects
 * unauthenticated requests to /login, but we re-check the session here so
 * that any code path which bypasses the proxy (e.g. partial pre-rendering,
 * future server components fetched directly) still requires a user.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header email={user.email ?? "unknown@example.com"} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
