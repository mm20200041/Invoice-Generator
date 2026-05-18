import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { resend, FROM_EMAIL } from "@/utils/resend/client"
import { getInvoice, updateLastSent } from "@/lib/db/invoices"
import { getProfile } from "@/lib/db/profiles"
import { getSignedPdfUrl } from "@/lib/pdf/render"
import { format } from "date-fns"
import type { CurrencyCode } from "@/lib/validators/profile"

export async function POST(
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

  const clientSnapshot = invoice.client_snapshot as { email?: string | null; full_name?: string | null; company_name?: string | null }
  if (!clientSnapshot.email) {
    return NextResponse.json(
      { ok: false, error: "Client has no email address" },
      { status: 400 },
    )
  }

  const profile = await getProfile(supabase, user.id)

  const senderName = profile.company_name || profile.full_name || "Invoice Generator"
  const clientName = clientSnapshot.company_name || clientSnapshot.full_name || "Client"

  const pdfPath = invoice.pdf_path
  if (!pdfPath) {
    return NextResponse.json({ ok: false, error: "PDF not found" }, { status: 400 })
  }

  const signedUrl = await getSignedPdfUrl(supabase, pdfPath, 300)
  if (!signedUrl) {
    return NextResponse.json({ ok: false, error: "Failed to get PDF" }, { status: 500 })
  }

  let attachmentBuffer: Buffer
  try {
    const response = await fetch(signedUrl)
    if (!response.ok) throw new Error("Failed to fetch PDF")
    const arrayBuffer = await response.arrayBuffer()
    attachmentBuffer = Buffer.from(arrayBuffer)
  } catch (e) {
    console.error("Failed to download PDF for email:", e)
    return NextResponse.json({ ok: false, error: "Failed to prepare attachment" }, { status: 500 })
  }

  const subject = `Invoice ${invoice.number} from ${senderName}`

  const currencySymbol: Record<CurrencyCode, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    CHF: "CHF ",
  }
  const symbol = currencySymbol[invoice.currency]
  const formattedTotal = `${symbol}${invoice.total.toFixed(2)}`
  const formattedDueDate = format(new Date(invoice.due_date), "MMM d, yyyy")

  const body = `Hi ${clientName},

Please find attached invoice ${invoice.number} for ${formattedTotal}, due by ${formattedDueDate}.

${invoice.stripe_checkout_url ? `You can pay online here: ${invoice.stripe_checkout_url}\n\n` : ""}If you have any questions, just reply to this email.

Thanks,
${senderName}`

  const bcc = profile.bcc_on_send ? profile.email || user.email : undefined

  try {
    const { error } = await resend.emails.send({
      from: `${senderName} <${process.env.RESEND_FROM_EMAIL || FROM_EMAIL}>`,
      to: clientSnapshot.email,
      bcc,
      replyTo: profile.email || user.email || undefined,
      subject,
      text: body,
      attachments: [
        {
          filename: `${invoice.number}.pdf`,
          content: attachmentBuffer.toString("base64"),
        },
      ],
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 })
    }

    await updateLastSent(supabase, invoiceId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Failed to send email:", err)
    return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 })
  }
}
