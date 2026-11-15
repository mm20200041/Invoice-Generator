import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import {
  IconPencil,
  IconDownload,
  IconArrowLeft,
} from "@tabler/icons-react"

import { createClient } from "@/utils/supabase/server"
import { getInvoice, listLineItems } from "@/lib/db/invoices"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { InvoiceDetailActions } from "@/components/invoices/invoice-detail-actions"

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
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

  const lineItems = await listLineItems(supabase, id)
  const isPaid = invoice.status === "paid"

  const sender = invoice.sender_snapshot as Record<string, string | null>
  const client = invoice.client_snapshot as Record<string, string | null>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="ghost" size="icon">
            <IconArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{invoice.number}</h1>
        <Badge variant={isPaid ? "default" : "secondary"}>
          {isPaid ? "Paid" : "Not Paid"}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isPaid && (
          <Link href={`/invoices/${id}/edit`}>
            <Button variant="outline">
              <IconPencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}

        <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline">
            <IconDownload className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </a>

        {!isPaid && (
          <InvoiceDetailActions
            invoiceId={id}
            invoiceNumber={invoice.number}
            hasClientEmail={Boolean(client.email)}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>From</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {sender.company_name && (
              <p className="font-semibold">{sender.company_name}</p>
            )}
            {sender.full_name && <p>{sender.full_name}</p>}
            {sender.address && (
              <p className="whitespace-pre-line text-muted-foreground">{sender.address}</p>
            )}
            {sender.vat_id && <p className="text-sm">VAT: {sender.vat_id}</p>}
            {sender.email && <p className="text-sm">{sender.email}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {client.company_name && (
              <p className="font-semibold">{client.company_name}</p>
            )}
            {client.full_name && <p>{client.full_name}</p>}
            {client.address && (
              <p className="whitespace-pre-line text-muted-foreground">{client.address}</p>
            )}
            {client.vat_id && <p className="text-sm">VAT: {client.vat_id}</p>}
            {client.email && <p className="text-sm">{client.email}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-medium">
                {format(new Date(invoice.invoice_date), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-medium">
                {format(new Date(invoice.due_date), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{invoice.currency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left text-sm font-medium">Description</th>
                  <th className="py-2 text-right text-sm font-medium">Qty</th>
                  <th className="py-2 text-right text-sm font-medium">Unit Price</th>
                  <th className="py-2 text-right text-sm font-medium">VAT %</th>
                  <th className="py-2 text-right text-sm font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right">
                      {item.quantity.toFixed(2)} {item.unit_type === "hours" ? "hrs" : ""}
                    </td>
                    <td className="py-3 text-right">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </td>
                    <td className="py-3 text-right">{item.vat_rate}%</td>
                    <td className="py-3 text-right">
                      {formatCurrency(item.line_subtotal, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(invoice.tax_total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.comments && (
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-muted-foreground">{invoice.comments}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    CHF: "CHF ",
  }
  const symbol = symbols[currency] || currency
  return `${symbol}${amount.toFixed(2)}`
}
