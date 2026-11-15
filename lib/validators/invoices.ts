import { z } from "zod"
import { CURRENCY_CODES } from "./profile"

const trimmedString = z
  .string()
  .trim()
  .max(255, { message: "Must be 255 characters or fewer" })

const optionalTrimmedString = z
  .string()
  .trim()
  .max(500, { message: "Must be 500 characters or fewer" })
  .nullable()
  .transform((v) => (v === "" ? null : v))

export const lineItemSchema = z.object({
  description: trimmedString.min(1, { message: "Description is required" }),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unit_type: z.enum(["hours", "flat"]),
  unit_price: z.number().min(0, "Price must be 0 or greater"),
  vat_rate: z.number().min(0, "VAT rate must be 0-100").max(100, "VAT rate must be 0-100"),
})

export type LineItemFormInput = z.infer<typeof lineItemSchema>

export const invoiceFormSchema = z.object({
  client_id: z.string().uuid({ message: "Please select a client" }),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  currency: z.enum(CURRENCY_CODES),
  comments: optionalTrimmedString,
  line_items: z.array(lineItemSchema).min(1, { message: "At least one line item is required" }),
})

export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>

export const invoiceFormDefaults = {
  client_id: "",
  invoice_date: formatDateISO(new Date()),
  due_date: formatDateISO(addDays(new Date(), 30)),
  currency: "EUR" as const,
  comments: null as string | null,
  line_items: [] as { description: string; quantity: number; unit_type: "hours" | "flat"; unit_price: number; vat_rate: number }[],
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function createDefaultLineItem(defaultVatRate: number = 0): LineItemFormInput {
  return {
    description: "",
    quantity: 1,
    unit_type: "flat",
    unit_price: 0,
    vat_rate: defaultVatRate,
  }
}
