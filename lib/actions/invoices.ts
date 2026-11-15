"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createClient } from "@/utils/supabase/server"
import { invoiceFormSchema, type InvoiceFormInput } from "@/lib/validators/invoices"
import type { CurrencyCode } from "@/lib/validators/profile"
import { getProfile } from "@/lib/db/profiles"
import { getClient } from "@/lib/db/clients"
import {
  createInvoice,
  updateInvoice,
  softDeleteInvoice,
  getInvoice,
  listLineItems,
  markInvoicePaid,
  type SenderSnapshot,
  type ClientSnapshot,
} from "@/lib/db/invoices"
import { generateAndUploadPdf } from "@/lib/pdf/render"

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function createInvoiceAction(
  raw: InvoiceFormInput,
): Promise<ActionResult<{ id: string; number: string }>> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Unauthorized" }
  }

  const parsed = invoiceFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid form data" }
  }

  const data = parsed.data

  const profile = await getProfile(supabase, user.id)
  const client = await getClient(supabase, data.client_id)
  if (!client) {
    return { ok: false, error: "Client not found" }
  }

  const senderSnapshot: SenderSnapshot = {
    full_name: profile.full_name,
    company_name: profile.company_name,
    email: profile.email,
    address: profile.address,
    vat_id: profile.vat_id,
    website: profile.website,
  }

  const clientSnapshot: ClientSnapshot = {
    full_name: client.full_name,
    company_name: client.company_name,
    email: client.email,
    address: client.address,
    vat_id: client.vat_id,
  }

  try {
    const invoice = await createInvoice(supabase, {
      user_id: user.id,
      client_id: data.client_id,
      sender_snapshot: senderSnapshot,
      client_snapshot: clientSnapshot,
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      currency: data.currency as CurrencyCode,
      comments: data.comments,
      line_items: data.line_items,
    })

    const lineItems = await listLineItems(supabase, invoice.id)
    await generateAndUploadPdf(supabase, invoice, lineItems)

    revalidatePath("/invoices")
    return { ok: true, data: { id: invoice.id, number: invoice.number } }
  } catch (err) {
    console.error("Failed to create invoice:", err)
    return { ok: false, error: "Failed to create invoice" }
  }
}

export async function updateInvoiceAction(
  invoiceId: string,
  raw: InvoiceFormInput,
): Promise<
  ActionResult<{ id: string; number: string; shouldPromptResend: boolean }>
> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Unauthorized" }
  }

  const existing = await getInvoice(supabase, invoiceId)
  if (!existing) {
    return { ok: false, error: "Invoice not found" }
  }
  if (existing.user_id !== user.id) {
    return { ok: false, error: "Unauthorized" }
  }
  if (existing.status === "paid") {
    return { ok: false, error: "Paid invoices cannot be edited" }
  }

  const parsed = invoiceFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid form data" }
  }

  const data = parsed.data

  const profile = await getProfile(supabase, user.id)
  const client = await getClient(supabase, data.client_id)
  if (!client) {
    return { ok: false, error: "Client not found" }
  }

  const senderSnapshot: SenderSnapshot = {
    full_name: profile.full_name,
    company_name: profile.company_name,
    email: profile.email,
    address: profile.address,
    vat_id: profile.vat_id,
    website: profile.website,
  }

  const clientSnapshot: ClientSnapshot = {
    full_name: client.full_name,
    company_name: client.company_name,
    email: client.email,
    address: client.address,
    vat_id: client.vat_id,
  }

  const previousSentVersion = existing.last_sent_version

  try {
    const invoice = await updateInvoice(supabase, invoiceId, {
      client_id: data.client_id,
      sender_snapshot: senderSnapshot,
      client_snapshot: clientSnapshot,
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      currency: data.currency as CurrencyCode,
      comments: data.comments,
      line_items: data.line_items,
    })

    const lineItems = await listLineItems(supabase, invoice.id)
    await generateAndUploadPdf(supabase, invoice, lineItems)

    // Prompt only on the first save after the previous send (Tech §10).
    const shouldPromptResend =
      previousSentVersion != null && invoice.version === previousSentVersion + 1

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${invoiceId}`)
    return {
      ok: true,
      data: {
        id: invoice.id,
        number: invoice.number,
        shouldPromptResend,
      },
    }
  } catch (err) {
    console.error("Failed to update invoice:", err)
    return { ok: false, error: "Failed to update invoice" }
  }
}

export async function deleteInvoiceAction(
  invoiceId: string,
): Promise<ActionResult> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Unauthorized" }
  }

  const existing = await getInvoice(supabase, invoiceId)
  if (!existing) {
    return { ok: false, error: "Invoice not found" }
  }
  if (existing.user_id !== user.id) {
    return { ok: false, error: "Unauthorized" }
  }
  if (existing.status === "paid") {
    return { ok: false, error: "Paid invoices cannot be deleted" }
  }

  try {
    await softDeleteInvoice(supabase, invoiceId)
    revalidatePath("/invoices")
    return { ok: true, data: undefined }
  } catch (err) {
    console.error("Failed to delete invoice:", err)
    return { ok: false, error: "Failed to delete invoice" }
  }
}

export async function markInvoicePaidAction(
  invoiceId: string,
): Promise<ActionResult> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Unauthorized" }
  }

  const existing = await getInvoice(supabase, invoiceId)
  if (!existing) {
    return { ok: false, error: "Invoice not found" }
  }
  if (existing.user_id !== user.id) {
    return { ok: false, error: "Unauthorized" }
  }
  if (existing.status === "paid") {
    return { ok: false, error: "Invoice is already paid" }
  }

  try {
    await markInvoicePaid(supabase, invoiceId)

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${invoiceId}`)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error("Failed to mark invoice paid:", err)
    return { ok: false, error: "Failed to mark invoice as paid" }
  }
}
