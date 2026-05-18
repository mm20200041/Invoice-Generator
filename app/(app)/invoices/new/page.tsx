import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/utils/supabase/server"
import { listClients } from "@/lib/db/clients"
import { getProfile } from "@/lib/db/profiles"
import { InvoiceForm } from "@/components/invoices/invoice-form"

export default async function NewInvoicePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: clients } = await listClients(supabase, user.id, { page: 1, pageSize: 1000 })
  const profile = await getProfile(supabase, user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Invoice</h1>
      </div>

      <InvoiceForm
        clients={clients}
        defaultCurrency={profile.default_currency}
        defaultVatRate={profile.default_vat_rate ?? 0}
      />
    </div>
  )
}
