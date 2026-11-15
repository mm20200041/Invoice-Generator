"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  invoiceFormSchema,
  type InvoiceFormInput,
  createDefaultLineItem,
} from "@/lib/validators/invoices"
import { createInvoiceAction, updateInvoiceAction } from "@/lib/actions/invoices"
import type { Client } from "@/lib/db/clients"
import type { CurrencyCode } from "@/lib/validators/profile"

interface InvoiceFormProps {
  clients: Client[]
  defaultCurrency: CurrencyCode
  defaultVatRate: number
  invoice?: {
    id: string
    client_id: string
    invoice_date: string
    due_date: string
    currency: CurrencyCode
    comments: string | null
    line_items: {
      description: string
      quantity: number
      unit_type: "hours" | "flat"
      unit_price: number
      vat_rate: number
    }[]
  }
}

export function InvoiceForm({ clients, defaultCurrency, defaultVatRate, invoice }: InvoiceFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendInvoiceId, setResendInvoiceId] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const isEditing = !!invoice

  const form = useForm<InvoiceFormInput>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoice
      ? {
          client_id: invoice.client_id,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          currency: invoice.currency,
          comments: invoice.comments,
          line_items: invoice.line_items,
        }
      : {
          client_id: "",
          invoice_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          currency: defaultCurrency,
          comments: null,
          line_items: [createDefaultLineItem(defaultVatRate)],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "line_items",
  })

  const lineItems = form.watch("line_items")
  const currency = form.watch("currency")

  const totals = calculateTotals(lineItems)

  async function navigateAfterSave(invoiceId: string) {
    router.push(`/invoices/${invoiceId}`)
  }

  async function handleResendConfirm() {
    if (!resendInvoiceId) return
    setIsResending(true)
    try {
      const res = await fetch(`/api/invoices/${resendInvoiceId}/send`, { method: "POST" })
      const sendData = await res.json()
      if (sendData.ok) {
        toast.success("Invoice resent to client")
      } else {
        toast.error(sendData.error || "Failed to resend invoice")
      }
    } catch {
      toast.error("Failed to resend invoice")
    } finally {
      setIsResending(false)
      const id = resendInvoiceId
      setResendInvoiceId(null)
      await navigateAfterSave(id)
    }
  }

  async function handleResendCancel() {
    const id = resendInvoiceId
    setResendInvoiceId(null)
    if (id) await navigateAfterSave(id)
  }

  async function onSubmit(data: InvoiceFormInput) {
    setIsSubmitting(true)

    if (isEditing) {
      const result = await updateInvoiceAction(invoice!.id, data)
      setIsSubmitting(false)

      if (result.ok) {
        toast.success(`Invoice ${result.data.number} updated`)
        if (result.data.shouldPromptResend) {
          setResendInvoiceId(result.data.id)
        } else {
          await navigateAfterSave(result.data.id)
        }
      } else {
        toast.error(result.error)
      }
    } else {
      const result = await createInvoiceAction(data)
      setIsSubmitting(false)

      if (result.ok) {
        toast.success(`Invoice ${result.data.number} created`)
        router.push(`/invoices/${result.data.id}`)
      } else {
        toast.error(result.error)
      }
    }
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name || client.full_name || "Unnamed Client"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CHF">CHF</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <FormField
                    control={form.control}
                    name={`line_items.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="sm:col-span-1">
                  <FormField
                    control={form.control}
                    name={`line_items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qty</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="sm:col-span-1">
                  <FormField
                    control={form.control}
                    name={`line_items.${index}.unit_type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="flat">Flat</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="sm:col-span-1">
                  <FormField
                    control={form.control}
                    name={`line_items.${index}.unit_price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="sm:col-span-1">
                  <FormField
                    control={form.control}
                    name={`line_items.${index}.vat_rate`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT %</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-end sm:col-span-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <IconTrash className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => append(createDefaultLineItem(defaultVatRate))}
            >
              <IconPlus className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(totals.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax:</span>
              <span>{formatCurrency(totals.tax, currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(totals.total, currency)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Optional comments or notes for the client..."
                      className="min-h-[100px]"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/invoices")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Update Invoice" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Form>

    <Dialog
      open={resendInvoiceId != null}
      onOpenChange={(open) => {
        if (!open && !isResending) void handleResendCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resend updated invoice?</DialogTitle>
          <DialogDescription>
            This invoice was previously sent. Would you like to email the updated PDF to the
            client?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => void handleResendCancel()} disabled={isResending}>
            Cancel
          </Button>
          <Button onClick={() => void handleResendConfirm()} disabled={isResending}>
            {isResending ? "Sending..." : "Resend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

function calculateTotals(
  lineItems: { quantity: number; unit_price: number; vat_rate: number }[],
) {
  let subtotal = 0
  let tax = 0

  for (const item of lineItems) {
    const itemSubtotal = item.quantity * item.unit_price
    const itemTax = itemSubtotal * (item.vat_rate / 100)
    subtotal += itemSubtotal
    tax += itemTax
  }

  return {
    subtotal: round(subtotal, 2),
    tax: round(tax, 2),
    total: round(subtotal + tax, 2),
  }
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
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
