import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"

import { createClient } from "@/utils/supabase/server"
import { listInvoices, type InvoiceStatus } from "@/lib/db/invoices"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { InvoiceActions } from "@/components/invoices/invoice-actions"

const PAGE_SIZE = 10

export default async function InvoicesPage(props: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}) {
  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const page = Math.max(1, parseInt(searchParams.page || "1", 10))
  const status = (searchParams.status || "all") as InvoiceStatus | "all"
  const search = searchParams.search || ""

  const { data: invoices, count } = await listInvoices(supabase, user.id, {
    page,
    status,
    search,
  })

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link href="/invoices/new">
          <Button>New Invoice</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs defaultValue={status} className="w-full sm:w-auto">
              <TabsList>
                <Link href={`/invoices?status=all${search ? `&search=${search}` : ""}`}>
                  <TabsTrigger value="all">All</TabsTrigger>
                </Link>
                <Link href={`/invoices?status=not_paid${search ? `&search=${search}` : ""}`}>
                  <TabsTrigger value="not_paid">Not Paid</TabsTrigger>
                </Link>
                <Link href={`/invoices?status=paid${search ? `&search=${search}` : ""}`}>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>

            <form className="flex w-full gap-2 sm:w-auto">
              <Input
                type="search"
                name="search"
                placeholder="Search invoices..."
                defaultValue={search}
                className="w-full sm:w-[250px]"
              />
              {status !== "all" && <input type="hidden" name="status" value={status} />}
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No invoices found. Create your first invoice to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                          {invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.client_name || "—"}</TableCell>
                      <TableCell>{format(new Date(invoice.invoice_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(invoice.due_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                          {invoice.status === "paid" ? "Paid" : "Not Paid"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <InvoiceActions invoice={invoice} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {page > 1 && (
                <Link
                  href={`/invoices?page=${page - 1}&status=${status}${search ? `&search=${search}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/invoices?page=${page + 1}&status=${status}${search ? `&search=${search}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
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
