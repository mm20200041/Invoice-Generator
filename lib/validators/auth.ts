import { z } from "zod"

/**
 * Password policy (PRD/Tech §5 — answer 7B):
 *   - Min 8 characters
 *   - At least 1 letter and 1 number
 */
export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[A-Za-z]/, { message: "Password must contain at least one letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })

export const emailSchema = z.email({ message: "Enter a valid email address" })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})
export type RegisterInput = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const resendConfirmationSchema = z.object({
  email: emailSchema,
})
export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>
