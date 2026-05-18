import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { getInvoice, markInvoicePaid, clearStripeSession } from "@/lib/db/invoices"
import { getStripe } from "@/utils/stripe/client"

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

  if (invoice.status === "paid") {
    return NextResponse.json({ ok: false, error: "Invoice is already paid" }, { status: 400 })
  }

  try {
    if (invoice.stripe_checkout_session_id) {
      try {
        await getStripe().checkout.sessions.expire(invoice.stripe_checkout_session_id)
      } catch {
        // ignore if already expired
      }
      await clearStripeSession(supabase, invoiceId)
    }

    await markInvoicePaid(supabase, invoiceId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to mark invoice paid:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to mark invoice as paid" },
      { status: 500 },
    )
  }
}
