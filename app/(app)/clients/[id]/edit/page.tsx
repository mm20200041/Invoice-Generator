import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { createClient as createSupabaseClient } from "@/utils/supabase/server"
import { getClient } from "@/lib/db/clients"
import { splitAddress } from "@/lib/validators/clients"
import { ClientForm } from "../../_components/client-form"
import type { ClientFormInput } from "@/lib/validators/clients"

export const metadata = {
  title: "Edit Client — Invoice Generator",
}

type EditClientPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const supabase = createSupabaseClient(await cookies())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { id } = await params
  const client = await getClient(supabase, id)

  if (!client || client.user_id !== user.id) notFound()

  const { street, city_country } = splitAddress(client.address)

  const initialValues: ClientFormInput = {
    full_name: client.full_name ?? "",
    company_name: client.company_name ?? "",
    email: client.email ?? "",
    street,
    city_country,
    vat_id: client.vat_id ?? "",
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Edit client
        </h1>
        <p className="text-sm text-muted-foreground">
          Update the details for{" "}
          <strong>{client.full_name ?? client.company_name ?? "this client"}</strong>.
        </p>
      </div>

      <ClientForm mode="edit" clientId={client.id} initialValues={initialValues} />
    </div>
  )
}
