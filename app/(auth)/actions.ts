"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendConfirmationSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResendConfirmationInput,
  type ResetPasswordInput,
} from "@/lib/validators/auth";

/**
 * Discriminated result returned by all auth actions.
 * - "ok"             → action succeeded
 * - "error"          → user-visible error message
 * - "needs_confirm"  → login failed because the email is not confirmed yet;
 *                      the form should surface a "Resend confirmation" CTA.
 *
 * Server actions that succeed AND navigate the user away (login, register,
 * resetPassword) call `redirect()` themselves; they only return a result
 * when something went wrong.
 */
export type AuthResult =
  | { status: "ok"; message?: string }
  | { status: "error"; message: string }
  | { status: "needs_confirm"; email: string };

function appOrigin() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set — required to build Supabase email-redirect URLs",
    );
  }
  return url.replace(/\/$/, "");
}

function isSafeNext(next: string | undefined | null): next is string {
  return !!next && next.startsWith("/") && !next.startsWith("//");
}

// -----------------------------------------------------------------------------
// LOGIN
// -----------------------------------------------------------------------------
export async function login(
  input: LoginInput,
  nextPath?: string,
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please check the form and try again." };
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Supabase returns this message when the user exists but the email is not confirmed.
    // Surface it as a distinct state so the UI can offer "Resend confirmation".
    if (/email not confirmed/i.test(error.message)) {
      return { status: "needs_confirm", email: parsed.data.email };
    }
    return { status: "error", message: "Invalid email or password." };
  }

  redirect(isSafeNext(nextPath) ? nextPath : "/dashboard");
}

// -----------------------------------------------------------------------------
// REGISTER
// -----------------------------------------------------------------------------
export async function register(input: RegisterInput): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Please check the form and try again." };
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${appOrigin()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  // Supabase returns a user with no identities when the email is already
  // registered (to avoid leaking account existence). Treat as a soft success
  // so the UX flow stays uniform — the user lands on /check-email and either
  // confirms or tries to log in.
  if (!data.user) {
    return {
      status: "error",
      message: "Could not create your account. Please try again.",
    };
  }

  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

// -----------------------------------------------------------------------------
// FORGOT PASSWORD
// -----------------------------------------------------------------------------
export async function forgotPassword(
  input: ForgotPasswordInput,
): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = createClient(await cookies());
  // Do not surface whether the email exists — always show success.
  // The callback exchanges the code and lands the user on /reset-password
  // with an active recovery session.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appOrigin()}/auth/callback?next=/reset-password`,
  });

  return {
    status: "ok",
    message:
      "If an account exists for that email, we just sent a password reset link.",
  };
}

// -----------------------------------------------------------------------------
// RESET PASSWORD (used on /reset-password after callback exchange)
// -----------------------------------------------------------------------------
export async function resetPassword(
  input: ResetPasswordInput,
): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid password.",
    };
  }

  const supabase = createClient(await cookies());

  // updateUser requires the recovery session that the callback created.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message:
        "Your reset link has expired. Request a new password reset email.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/dashboard");
}

// -----------------------------------------------------------------------------
// RESEND EMAIL CONFIRMATION
// -----------------------------------------------------------------------------
export async function resendConfirmation(
  input: ResendConfirmationInput,
): Promise<AuthResult> {
  const parsed = resendConfirmationSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${appOrigin()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "ok",
    message: "Confirmation email sent. Please check your inbox.",
  };
}

// -----------------------------------------------------------------------------
// SIGN OUT
// -----------------------------------------------------------------------------
export async function signOut() {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  redirect("/login");
}
