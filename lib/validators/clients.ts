import { z } from "zod"

const trimmedString = z
  .string()
  .trim()
  .max(255, { message: "Must be 255 characters or fewer" })

const optionalEmail = trimmedString.refine(
  (v) => v === "" || z.string().email().safeParse(v).success,
  { message: "Enter a valid email address" },
)

export const clientFormSchema = z
  .object({
    full_name: trimmedString,
    company_name: trimmedString,
    email: optionalEmail,
    street: trimmedString.max(500, { message: "Must be 500 characters or fewer" }),
    city_country: trimmedString.max(500, { message: "Must be 500 characters or fewer" }),
    vat_id: trimmedString,
  })
  .refine((data) => data.full_name !== "" || data.company_name !== "", {
    message: "Enter at least a full name or a company name.",
    path: ["full_name"],
  })

export type ClientFormInput = z.infer<typeof clientFormSchema>

export const clientFormDefaults: ClientFormInput = {
  full_name: "",
  company_name: "",
  email: "",
  street: "",
  city_country: "",
  vat_id: "",
}

/**
 * Join the two address form fields into a single DB text value.
 * Empty parts are omitted so we don't store trailing newlines.
 */
export function joinAddress(street: string, cityCountry: string): string | null {
  const parts = [street.trim(), cityCountry.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join("\n") : null
}

/**
 * Split a stored address text back into the two form fields.
 * If the value has no newline, the whole string goes into `street`.
 */
export function splitAddress(address: string | null): { street: string; city_country: string } {
  if (!address) return { street: "", city_country: "" }
  const newline = address.indexOf("\n")
  if (newline === -1) return { street: address, city_country: "" }
  return {
    street: address.slice(0, newline),
    city_country: address.slice(newline + 1),
  }
}
