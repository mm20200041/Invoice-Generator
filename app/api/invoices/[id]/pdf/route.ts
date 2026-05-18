import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { getInvoice } from "@/lib/db/invoices"
import { listLineItems } from "@/lib/db/lineItems"
import { getSignedPdfUrl, renderInvoicePdf } from "@/lib/pdf/render"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: invoiceId } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const invoice = await getInvoice(supabase, invoiceId)
  if (!invoice) {
    return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 })
  }
  if (invoice.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 })
  }

  const pdfPath = invoice.pdf_path
  if (pdfPath) {
    const signedUrl = await getSignedPdfUrl(supabase, pdfPath, 60)
    if (signedUrl) {
      return NextResponse.redirect(signedUrl)
    }
  }

  // Fallback: regenerate on demand
  const lineItems = await listLineItems(supabase, invoiceId)
  const pdfBuffer = await renderInvoicePdf(invoice, lineItems)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  })
}
