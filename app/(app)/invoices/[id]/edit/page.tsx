import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"

import { createClient } from "@/utils/supabase/server"
import { listClients } from "@/lib/db/clients"
import { getProfile } from "@/lib/db/profiles"
import { getInvoice, listLineItems } from "@/lib/db/invoices"
import { InvoiceForm } from "@/components/invoices/invoice-form"

interface EditInvoicePageProps {
  params: Promise<{ id: string }>
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const invoice = await getInvoice(supabase, id)
  if (!invoice || invoice.user_id !== user.id) {
    notFound()
  }

  if (invoice.status === "paid") {
    redirect(`/invoices/${id}`)
  }

  const { data: clients } = await listClients(supabase, user.id, { page: 1, pageSize: 1000 })
  const profile = await getProfile(supabase, user.id)
  const lineItems = await listLineItems(supabase, id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Invoice {invoice.number}</h1>
      </div>

      <InvoiceForm
        clients={clients}
        defaultCurrency={profile.default_currency}
        defaultVatRate={profile.default_vat_rate ?? 0}
        invoice={{
          id: invoice.id,
          client_id: invoice.client_id!,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          currency: invoice.currency,
          comments: invoice.comments,
          line_items: lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit_type: item.unit_type,
            unit_price: item.unit_price,
            vat_rate: item.vat_rate,
          })),
        }}
      />
    </div>
  )
}
