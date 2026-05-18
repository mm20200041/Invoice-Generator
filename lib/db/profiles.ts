import type { SupabaseClient } from "@supabase/supabase-js"

import type { CurrencyCode } from "@/lib/validators/profile"

/**
 * Shape of a row in public.profiles. We narrow Supabase's untyped client
 * here so callers get an explicit contract without needing generated DB
 * types yet.
 */
export type Profile = {
  id: string
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
  website: string | null
  default_vat_rate: number | null
  default_currency: CurrencyCode
  bcc_on_send: boolean
  stripe_account_id: string | null
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  stripe_details_submitted: boolean
  created_at: string
  updated_at: string
}

/** Fields the user can edit from /settings/profile. */
export type ProfileUpdate = {
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
  website: string | null
  default_vat_rate: number | null
  default_currency: CurrencyCode
  bcc_on_send: boolean
}

/**
 * Fetch the current user's profile row. The auth.users → profiles trigger
 * guarantees this row exists for any signed-in user; if it is somehow
 * missing (e.g. legacy account predating the trigger) we upsert a blank
 * row keyed on `auth.uid()` so the page can still render.
 */
export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Profile>()

  if (error) throw error
  if (data) return data

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select("*")
    .single<Profile>()

  if (insertError) throw insertError
  return inserted
}

/**
 * Update the current user's profile. RLS limits the UPDATE to the row
 * where id = auth.uid(), so the caller does not need to (and should not)
 * include `id` in the patch.
 */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: ProfileUpdate,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single<Profile>()

  if (error) throw error
  return data
}
