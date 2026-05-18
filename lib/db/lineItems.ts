import type { SupabaseClient } from "@supabase/supabase-js"

export type LineUnitType = "hours" | "flat"

export type LineItem = {
  id: string
  invoice_id: string
  position: number
  description: string
  quantity: number
  unit_type: LineUnitType
  unit_price: number
  vat_rate: number
  line_subtotal: number
  line_tax: number
  line_total: number
  created_at: string
}

export type LineItemInsert = {
  description: string
  quantity: number
  unit_type: LineUnitType
  unit_price: number
  vat_rate: number
}

export async function listLineItems(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<LineItem[]> {
  const { data, error } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("position", { ascending: true })

  if (error) throw error
  return (data ?? []) as LineItem[]
}

export async function getLineItem(
  supabase: SupabaseClient,
  lineItemId: string,
): Promise<LineItem | null> {
  const { data, error } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("id", lineItemId)
    .maybeSingle<LineItem>()

  if (error) throw error
  return data
}

export function computeLineItemTotals(item: LineItemInsert) {
  const lineSubtotal = round(item.quantity * item.unit_price, 2)
  const lineTax = round(lineSubtotal * (item.vat_rate / 100), 2)
  return {
    line_subtotal: lineSubtotal,
    line_tax: lineTax,
    line_total: round(lineSubtotal + lineTax, 2),
  }
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
