import { z } from "zod"

/**
 * Profile / sender details form schema.
 *
 * Per PRD §4.2 every sender field is optional. We only format-validate
 * non-empty values. The server action normalizes empty strings → `null`
 * before writing to the DB so the columns stay clean.
 *
 * All form fields are plain strings (or boolean) so react-hook-form has
 * a stable controlled-input value. The vat-rate string is parsed in the
 * server action.
 */
export const CURRENCY_CODES = ["EUR", "USD", "GBP", "CHF"] as const
export type CurrencyCode = (typeof CURRENCY_CODES)[number]

const trimmedString = z
  .string()
  .trim()
  .max(255, { message: "Must be 255 characters or fewer" })

const optionalEmail = trimmedString.refine(
  (v) => v === "" || z.email().safeParse(v).success,
  { message: "Enter a valid email address" },
)

const optionalUrl = trimmedString.refine(
  (v) => v === "" || z.url().safeParse(v).success,
  { message: "Enter a valid URL (e.g. https://example.com)" },
)

const optionalVatRateString = z
  .string()
  .trim()
  .refine(
    (v) => {
      if (v === "") return true
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 && n <= 100
    },
    { message: "VAT rate must be between 0 and 100" },
  )

export const profileFormSchema = z.object({
  full_name: trimmedString,
  company_name: trimmedString,
  email: optionalEmail,
  address: trimmedString.max(500, { message: "Must be 500 characters or fewer" }),
  vat_id: trimmedString,
  website: optionalUrl,
  default_vat_rate: optionalVatRateString,
  default_currency: z.enum(CURRENCY_CODES),
  bcc_on_send: z.boolean(),
})

export type ProfileFormInput = z.infer<typeof profileFormSchema>

/**
 * Form-friendly defaults so every field is controlled from first render.
 */
export const profileFormDefaults: ProfileFormInput = {
  full_name: "",
  company_name: "",
  email: "",
  address: "",
  vat_id: "",
  website: "",
  default_vat_rate: "",
  default_currency: "EUR",
  bcc_on_send: true,
}
