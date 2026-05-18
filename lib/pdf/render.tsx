import { renderToBuffer } from "@react-pdf/renderer"
import type { SupabaseClient } from "@supabase/supabase-js"
import { InvoiceDocument } from "./InvoiceDocument"
import type { Invoice, LineItem } from "@/lib/db/invoices"

export async function generateAndUploadPdf(
  supabase: SupabaseClient,
  invoice: Invoice,
  lineItems: LineItem[],
): Promise<string> {
  const buffer = await renderInvoicePdf(invoice, lineItems)

  const path = `${invoice.user_id}/${invoice.id}/${invoice.number}.pdf`

  const { error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Failed to upload PDF: ${uploadError.message}`)
  }

  return path
}

export async function renderInvoicePdf(
  invoice: Invoice,
  lineItems: LineItem[],
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <InvoiceDocument invoice={invoice} lineItems={lineItems} />,
  )
  return buffer
}

export async function getSignedPdfUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds: number = 300,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("invoices")
    .createSignedUrl(path, expiresInSeconds)

  if (error) {
    console.error("Failed to create signed URL:", error)
    return null
  }

  return data?.signedUrl ?? null
}
