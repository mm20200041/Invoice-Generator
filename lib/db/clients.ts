import type { SupabaseClient } from "@supabase/supabase-js"

export type Client = {
  id: string
  user_id: string
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
  created_at: string
  updated_at: string
}

export type ClientInsert = Omit<Client, "id" | "created_at" | "updated_at">
export type ClientUpdate = Partial<Omit<Client, "id" | "user_id" | "created_at" | "updated_at">>

const PAGE_SIZE = 10

export async function listClients(
  supabase: SupabaseClient,
  userId: string,
  { page = 1, pageSize = PAGE_SIZE }: { page?: number; pageSize?: number } = {},
): Promise<{ data: Client[]; count: number }> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from("clients")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data: (data ?? []) as Client[], count: count ?? 0 }
}

export async function getClient(
  supabase: SupabaseClient,
  clientId: string,
): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle<Client>()

  if (error) throw error
  return data
}

export async function createClient(
  supabase: SupabaseClient,
  patch: ClientInsert,
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert(patch)
    .select("*")
    .single<Client>()

  if (error) throw error
  return data
}

export async function updateClient(
  supabase: SupabaseClient,
  clientId: string,
  patch: ClientUpdate,
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", clientId)
    .select("*")
    .single<Client>()

  if (error) throw error
  return data
}

export async function deleteClient(
  supabase: SupabaseClient,
  clientId: string,
): Promise<void> {
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)

  if (error) throw error
}
