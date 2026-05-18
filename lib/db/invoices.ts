import type { SupabaseClient } from "@supabase/supabase-js"
import type { CurrencyCode } from "@/lib/validators/profile"
import type { LineItemInsert } from "./lineItems"
export { listLineItems } from "./lineItems"

export type InvoiceStatus = "not_paid" | "paid"

export type Invoice = {
  id: string
  user_id: string
  client_id: string | null
  sender_snapshot: SenderSnapshot
  client_snapshot: ClientSnapshot
  year: number
  sequence: number
  number: string
  invoice_date: string
  due_date: string
  currency: CurrencyCode
  comments: string | null
  subtotal: number
  tax_total: number
  total: number
  status: InvoiceStatus
  paid_at: string | null
  version: number
  last_sent_version: number | null
  last_sent_at: string | null
  stripe_checkout_session_id: string | null
  stripe_checkout_url: string | null
  stripe_checkout_expires_at: string | null
  pdf_path: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type SenderSnapshot = {
  full_name?: string | null
  company_name?: string | null
  email?: string | null
  address?: string | null
  vat_id?: string | null
  website?: string | null
}

export type ClientSnapshot = {
  full_name?: string | null
  company_name?: string | null
  email?: string | null
  address?: string | null
  vat_id?: string | null
}

export type InvoiceListItem = Pick<
  Invoice,
  "id" | "number" | "invoice_date" | "due_date" | "total" | "status" | "currency"
> & {
  client_name: string | null
}

const PAGE_SIZE = 10

export async function listInvoices(
  supabase: SupabaseClient,
  userId: string,
  {
    page = 1,
    status,
    search,
  }: {
    page?: number
    status?: InvoiceStatus | "all"
    search?: string
  } = {},
): Promise<{ data: InvoiceListItem[]; count: number }> {
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("invoices")
    .select(
      "id, number, invoice_date, due_date, total, status, currency, client_snapshot",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase()
    query = query.or(`number.ilike.%${term}%,client_snapshot->>full_name.ilike.%${term}%,client_snapshot->>company_name.ilike.%${term}%`)
  }

  const { data, error, count } = await query.range(from, to)

  if (error) throw error

  const mapped = (data ?? []).map((row): InvoiceListItem => {
    const cs = (row.client_snapshot ?? {}) as ClientSnapshot
    const clientName = cs.company_name || cs.full_name || null
    return {
      id: row.id,
      number: row.number,
      invoice_date: row.invoice_date,
      due_date: row.due_date,
      total: row.total,
      status: row.status,
      currency: row.currency as CurrencyCode,
      client_name: clientName,
    }
  })

  return { data: mapped, count: count ?? 0 }
}

export async function getInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .is("deleted_at", null)
    .maybeSingle<Invoice>()

  if (error) throw error
  return data
}

export async function getInvoiceWithLineItems(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<{ invoice: Invoice; lineItems: LineItem[] } | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(`*, line_items:invoice_line_items(*)`)
    .eq("id", invoiceId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const { line_items, ...invoice } = data as unknown as Invoice & { line_items: LineItem[] }
  return { invoice: invoice as unknown as Invoice, lineItems: line_items }
}

export type LineItem = {
  id: string
  invoice_id: string
  position: number
  description: string
  quantity: number
  unit_type: "hours" | "flat"
  unit_price: number
  vat_rate: number
  line_subtotal: number
  line_tax: number
  line_total: number
  created_at: string
}

export type InvoiceCreateInput = {
  user_id: string
  client_id: string
  sender_snapshot: SenderSnapshot
  client_snapshot: ClientSnapshot
  invoice_date: string
  due_date: string
  currency: CurrencyCode
  comments: string | null
  line_items: LineItemInsert[]
}

export async function createInvoice(
  supabase: SupabaseClient,
  input: InvoiceCreateInput,
): Promise<Invoice> {
  const year = new Date().getFullYear()
  let sequence: number

  const { data: counter, error: counterError } = await supabase
    .rpc("issue_invoice_number", {
      p_user_id: input.user_id,
      p_year: year,
    })
    .single<number>()

  if (counterError) {
    const { data: existing } = await supabase
      .from("invoice_counters")
      .select("next_sequence")
      .eq("user_id", input.user_id)
      .eq("year", year)
      .maybeSingle<{ next_sequence: number }>()

    if (existing) {
      sequence = existing.next_sequence
      const { error: updateError } = await supabase
        .from("invoice_counters")
        .update({ next_sequence: sequence + 1 })
        .eq("user_id", input.user_id)
        .eq("year", year)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabase
        .from("invoice_counters")
        .insert({ user_id: input.user_id, year, next_sequence: 2 })
      if (insertError) throw insertError
      sequence = 1
    }
  } else {
    sequence = counter ?? 1
  }

  const totals = computeTotals(input.line_items)

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: input.user_id,
      client_id: input.client_id,
      sender_snapshot: input.sender_snapshot,
      client_snapshot: input.client_snapshot,
      year,
      sequence,
      invoice_date: input.invoice_date,
      due_date: input.due_date,
      currency: input.currency,
      comments: input.comments,
      subtotal: totals.subtotal,
      tax_total: totals.tax_total,
      total: totals.total,
    })
    .select("*")
    .single<Invoice>()

  if (error) throw error

  await insertLineItems(supabase, data.id, input.line_items)
  return data
}

export type InvoiceUpdateInput = {
  client_id: string
  sender_snapshot: SenderSnapshot
  client_snapshot: ClientSnapshot
  invoice_date: string
  due_date: string
  currency: CurrencyCode
  comments: string | null
  line_items: LineItemInsert[]
}

export async function updateInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
  input: InvoiceUpdateInput,
): Promise<Invoice> {
  const totals = computeTotals(input.line_items)

  const { data: existing, error: fetchError } = await supabase
    .from("invoices")
    .select("version")
    .eq("id", invoiceId)
    .single<{ version: number }>()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from("invoices")
    .update({
      client_id: input.client_id,
      sender_snapshot: input.sender_snapshot,
      client_snapshot: input.client_snapshot,
      invoice_date: input.invoice_date,
      due_date: input.due_date,
      currency: input.currency,
      comments: input.comments,
      subtotal: totals.subtotal,
      tax_total: totals.tax_total,
      total: totals.total,
      version: (existing?.version ?? 1) + 1,
    })
    .eq("id", invoiceId)
    .select("*")
    .single<Invoice>()

  if (error) throw error

  await supabase.from("invoice_line_items").delete().eq("invoice_id", invoiceId)
  await insertLineItems(supabase, invoiceId, input.line_items)

  return data
}

export async function softDeleteInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", invoiceId)

  if (error) throw error
}

export async function markInvoicePaid(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("status", "not_paid")

  if (error) throw error
}

export async function updateLastSent(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("invoices")
    .update({ last_sent_at: now })
    .eq("id", invoiceId)

  if (error) throw error
}

export async function updateStripeSession(
  supabase: SupabaseClient,
  invoiceId: string,
  sessionId: string,
  checkoutUrl: string,
  expiresAt: string,
): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({
      stripe_checkout_session_id: sessionId,
      stripe_checkout_url: checkoutUrl,
      stripe_checkout_expires_at: expiresAt,
    })
    .eq("id", invoiceId)

  if (error) throw error
}

export async function clearStripeSession(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({
      stripe_checkout_session_id: null,
      stripe_checkout_url: null,
      stripe_checkout_expires_at: null,
    })
    .eq("id", invoiceId)

  if (error) throw error
}

export async function updatePdfPath(
  supabase: SupabaseClient,
  invoiceId: string,
  pdfPath: string,
): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({ pdf_path: pdfPath })
    .eq("id", invoiceId)

  if (error) throw error
}

function computeTotals(lineItems: LineItemInsert[]) {
  let subtotal = 0
  let tax_total = 0

  for (const item of lineItems) {
    const lineSubtotal = round(item.quantity * item.unit_price, 2)
    const lineTax = round(lineSubtotal * (item.vat_rate / 100), 2)
    subtotal += lineSubtotal
    tax_total += lineTax
  }

  return {
    subtotal: round(subtotal, 2),
    tax_total: round(tax_total, 2),
    total: round(subtotal + tax_total, 2),
  }
}

async function insertLineItems(
  supabase: SupabaseClient,
  invoiceId: string,
  items: LineItemInsert[],
) {
  if (items.length === 0) return

  const rows = items.map((item, idx) => {
    const lineSubtotal = round(item.quantity * item.unit_price, 2)
    const lineTax = round(lineSubtotal * (item.vat_rate / 100), 2)
    return {
      invoice_id: invoiceId,
      position: idx + 1,
      description: item.description,
      quantity: item.quantity,
      unit_type: item.unit_type,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      line_subtotal: lineSubtotal,
      line_tax: lineTax,
      line_total: round(lineSubtotal + lineTax, 2),
    }
  })

  const { error } = await supabase.from("invoice_line_items").insert(rows)
  if (error) throw error
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
