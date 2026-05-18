"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createClient } from "@/utils/supabase/server"
import { updateProfile as updateProfileRow } from "@/lib/db/profiles"
import {
  profileFormSchema,
  type ProfileFormInput,
} from "@/lib/validators/profile"

/**
 * Discriminated result for the profile form. Mirrors the shape used by
 * the auth actions so the client-side handler logic is consistent.
 */
export type ProfileActionResult =
  | { status: "ok"; message?: string }
  | { status: "error"; message: string }

/** Empty string → null so optional text columns stay clean. */
function toNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export async function updateProfile(
  input: ProfileFormInput,
): Promise<ProfileActionResult> {
  const parsed = profileFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Please check the form and try again.",
    }
  }

  const supabase = createClient(await cookies())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: "error", message: "You are not signed in." }
  }

  const v = parsed.data
  const vatRate = v.default_vat_rate.trim() === "" ? null : Number(v.default_vat_rate)

  try {
    await updateProfileRow(supabase, user.id, {
      full_name: toNullable(v.full_name),
      company_name: toNullable(v.company_name),
      email: toNullable(v.email),
      address: toNullable(v.address),
      vat_id: toNullable(v.vat_id),
      website: toNullable(v.website),
      default_vat_rate: vatRate,
      default_currency: v.default_currency,
      bcc_on_send: v.bcc_on_send,
    })
  } catch (error) {
    console.error("updateProfile failed", { userId: user.id, error })
    return {
      status: "error",
      message: "Could not save your profile. Please try again.",
    }
  }

  // Refresh both the page itself (so server-rendered values are fresh)
  // and the dashboard (so the completion banner disappears).
  revalidatePath("/settings/profile")
  revalidatePath("/dashboard")

  return { status: "ok", message: "Profile saved." }
}
