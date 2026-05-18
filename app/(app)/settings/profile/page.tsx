import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/utils/supabase/server"
import { getProfile } from "@/lib/db/profiles"
import {
  profileFormDefaults,
  type CurrencyCode,
  type ProfileFormInput,
} from "@/lib/validators/profile"

import { ProfileForm } from "./profile-form"

export const metadata = {
  title: "Profile — Invoice Generator",
}

export default async function ProfilePage() {
  const supabase = createClient(await cookies())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    // The (app) layout already enforces auth, but be defensive.
    redirect("/login")
  }

  const profile = await getProfile(supabase, user.id)
  const authEmail = user.email ?? ""

  // Build initial form values. Empty strings (never null) so RHF stays controlled.
  // If the user has not set a sender email yet, pre-fill it with the auth email
  // so a brand-new account can save once and have a sensible default.
  const initialValues: ProfileFormInput = {
    ...profileFormDefaults,
    full_name: profile.full_name ?? "",
    company_name: profile.company_name ?? "",
    email: profile.email ?? authEmail,
    address: profile.address ?? "",
    vat_id: profile.vat_id ?? "",
    website: profile.website ?? "",
    default_vat_rate:
      profile.default_vat_rate === null || profile.default_vat_rate === undefined
        ? ""
        : String(profile.default_vat_rate),
    default_currency: (profile.default_currency ?? "EUR") as CurrencyCode,
    bcc_on_send: profile.bcc_on_send ?? true,
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          These details appear on every invoice you send.
        </p>
      </div>

      <ProfileForm initialValues={initialValues} authEmail={authEmail} />
    </div>
  )
}
