import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { getInvoice, updateStripeSession } from "@/lib/db/invoices"
import { getProfile } from "@/lib/db/profiles"
import { getStripe } from "@/utils/stripe/client"

function stripe() {
  return getStripe()
}

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

  const profile = await getProfile(supabase, user.id)
  if (!profile.stripe_account_id || !profile.stripe_charges_enabled) {
    return NextResponse.json(
      { ok: false, error: "Stripe not connected or charges not enabled" },
      { status: 400 },
    )
  }

  if (invoice.status === "paid") {
    return NextResponse.json({ ok: false, error: "Invoice is already paid" }, { status: 400 })
  }

  // Check if existing session is still valid
  if (invoice.stripe_checkout_session_id && invoice.stripe_checkout_url) {
    try {
      const session = await stripe().checkout.sessions.retrieve(
        invoice.stripe_checkout_session_id,
        {},
        { stripeAccount: profile.stripe_account_id },
      )
      if (session.status === "open") {
        return NextResponse.json({ ok: true, url: invoice.stripe_checkout_url })
      }
    } catch {
      // Session expired or invalid, create new one
    }
  }

  // Create new checkout session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const amountInCents = Math.round(invoice.total * 100)

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        currency: invoice.currency.toLowerCase(),
        line_items: [
          {
            price_data: {
              currency: invoice.currency.toLowerCase(),
              product_data: {
                name: `Invoice ${invoice.number}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          invoice_id: invoice.id,
          user_id: user.id,
        },
        success_url: `${appUrl}/invoices/${invoiceId}?success=1`,
        cancel_url: `${appUrl}/invoices/${invoiceId}?canceled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      { stripeAccount: profile.stripe_account_id },
    )

    const expiresAt = new Date((session.expires_at || 0) * 1000).toISOString()
    await updateStripeSession(supabase, invoiceId, session.id, session.url!, expiresAt)

    return NextResponse.json({ ok: true, url: session.url })
  } catch (error) {
    console.error("Failed to create checkout session:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to create payment link" },
      { status: 500 },
    )
  }
}
