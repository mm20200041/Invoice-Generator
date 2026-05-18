import { Suspense } from "react"
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { IconPlus } from "@tabler/icons-react"

import { createClient } from "@/utils/supabase/server"
import { listClients } from "@/lib/db/clients"
import { Button } from "@/components/ui/button"
import { ClientsTable } from "./_components/clients-table"
import { ClientsEmptyState } from "./_components/clients-empty-state"
import { Pagination } from "./_components/pagination"
import { ClientsToast } from "./_components/clients-toast"

export const metadata = {
  title: "Clients — Invoice Generator",
}

const PAGE_SIZE = 10

type ClientsPageProps = {
  searchParams: Promise<{ page?: string; created?: string; updated?: string }>
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const supabase = createClient(await cookies())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  const { data: clients, count } = await listClients(supabase, user.id, { page, pageSize: PAGE_SIZE })
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage the clients you bill. Add them to invoices when needed.
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <IconPlus className="size-4" />
            Add client
          </Link>
        </Button>
      </div>

      <Suspense>
        <ClientsToast />
      </Suspense>

      {clients.length === 0 ? (
        <ClientsEmptyState />
      ) : (
        <>
          <ClientsTable clients={clients} />
          <Suspense>
            <Pagination page={page} totalPages={totalPages} />
          </Suspense>
        </>
      )}
    </div>
  )
}
