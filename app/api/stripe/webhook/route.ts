import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type Stripe from "stripe"
import { getStripe } from "@/utils/stripe/client"

function stripe() {
  return getStripe()
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe().webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  })

  try {
    const { data: existing } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    await supabase.from("stripe_webhook_events").insert({
      id: event.id,
      type: event.type,
      payload: event,
    })

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const invoiceId = session.metadata?.invoice_id

      if (invoiceId) {
        const { data: invoice } = await supabase
          .from("invoices")
          .select("id, status")
          .eq("id", invoiceId)
          .maybeSingle()

        if (invoice && invoice.status === "not_paid") {
          await supabase
            .from("invoices")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("id", invoiceId)
        }
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account

      await supabase
        .from("profiles")
        .update({
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_details_submitted: account.details_submitted,
        })
        .eq("stripe_account_id", account.id)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
