import Stripe from "stripe"

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your .env.local file.",
    )
  }
  cached = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
  })
  return cached
}
