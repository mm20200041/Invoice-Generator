import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { getProfile } from "@/lib/db/profiles"
import { getStripe } from "@/utils/stripe/client"

function stripe() {
  return getStripe()
}

export async function POST(_request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const profile = await getProfile(supabase, user.id)

  try {
    let accountId = profile.stripe_account_id

    if (!accountId) {
      const account = await stripe().accounts.create({
        type: "express",
        email: user.email!,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id

      await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id)
    }

    const refreshUrl = process.env.STRIPE_CONNECT_REFRESH_URL || `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments`
    const returnUrl = process.env.STRIPE_CONNECT_RETURN_URL || `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?onboarded=1`

    const accountLink = await stripe().accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    })

    return NextResponse.json({ ok: true, url: accountLink.url })
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error)
    return NextResponse.json(
      { ok: false, error: "Failed to create onboarding link" },
      { status: 500 },
    )
  }
}
