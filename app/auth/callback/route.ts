import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/utils/supabase/server";

/**
 * Supabase email-link callback.
 *
 * Handles BOTH magic-link confirmation (after signUp) and password-recovery
 * links, in a single route. Supabase appends a `?code=...` PKCE param to the
 * URL configured in `emailRedirectTo` / `redirectTo`. We exchange that code
 * for a session cookie and then forward the user to the `next` path.
 *
 * - Signup confirm  → `?code=...&next=/dashboard`        → /dashboard
 * - Password reset  → `?code=...&next=/reset-password`   → /reset-password
 * - Anything else   → /login?error=...
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/dashboard";

  // Supabase appended an explicit error (e.g. expired link).
  if (errorDescription) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", errorDescription);
    return NextResponse.redirect(url);
  }

  if (code) {
    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    const url = new URL("/login", origin);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  // No code, no error — someone hit the callback directly.
  return NextResponse.redirect(new URL("/login", origin));
}
