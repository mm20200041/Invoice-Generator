"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient as createSupabaseClient } from "@/utils/supabase/server"
import {
  createClient,
  updateClient,
  deleteClient,
} from "@/lib/db/clients"
import {
  clientFormSchema,
  joinAddress,
  type ClientFormInput,
} from "@/lib/validators/clients"

export type ClientActionResult =
  | { status: "ok"; message?: string }
  | { status: "error"; message: string }

function toNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export async function createClientAction(
  input: ClientFormInput,
): Promise<ClientActionResult> {
  const parsed = clientFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    }
  }

  const supabase = createSupabaseClient(await cookies())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: "error", message: "You are not signed in." }

  const v = parsed.data

  try {
    await createClient(supabase, {
      user_id: user.id,
      full_name: toNullable(v.full_name),
      company_name: toNullable(v.company_name),
      email: toNullable(v.email),
      address: joinAddress(v.street, v.city_country),
      vat_id: toNullable(v.vat_id),
    })
  } catch (error) {
    console.error("createClientAction failed", { userId: user.id, error })
    return { status: "error", message: "Could not save the client. Please try again." }
  }

  revalidatePath("/clients")
  redirect("/clients?created=1")
}

export async function updateClientAction(
  clientId: string,
  input: ClientFormInput,
): Promise<ClientActionResult> {
  const parsed = clientFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    }
  }

  const supabase = createSupabaseClient(await cookies())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: "error", message: "You are not signed in." }

  const v = parsed.data

  try {
    await updateClient(supabase, clientId, {
      full_name: toNullable(v.full_name),
      company_name: toNullable(v.company_name),
      email: toNullable(v.email),
      address: joinAddress(v.street, v.city_country),
      vat_id: toNullable(v.vat_id),
    })
  } catch (error) {
    console.error("updateClientAction failed", { clientId, userId: user.id, error })
    return { status: "error", message: "Could not update the client. Please try again." }
  }

  revalidatePath("/clients")
  redirect("/clients?updated=1")
}

export async function deleteClientAction(
  clientId: string,
): Promise<ClientActionResult> {
  const supabase = createSupabaseClient(await cookies())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: "error", message: "You are not signed in." }

  try {
    await deleteClient(supabase, clientId)
  } catch (error) {
    console.error("deleteClientAction failed", { clientId, userId: user.id, error })
    return { status: "error", message: "Could not delete the client. Please try again." }
  }

  revalidatePath("/clients")
  return { status: "ok", message: "Client deleted." }
}
