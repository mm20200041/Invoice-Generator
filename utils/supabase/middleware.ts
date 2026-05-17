import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Path prefixes that REQUIRE an authenticated user.
 * Anything inside the (app) route group lives at one of these prefixes.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/invoices", "/clients", "/settings"];

/**
 * Path prefixes that are intended for ANONYMOUS users only.
 * Logged-in users get bounced to /dashboard from these.
 */
const AUTH_ONLY_PREFIXES = ["/login", "/register"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Supabase session refresh + route protection for Next.js 16 Proxy.
 * Called from the root `proxy.ts`. Returns a NextResponse that:
 *   - refreshes auth cookies on every request,
 *   - redirects unauthenticated requests away from protected paths,
 *   - redirects authenticated requests away from /login and /register.
 *
 * The cookie-copy dance is required so the refreshed session cookies
 * survive any redirect we return.
 */
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: Do not put any logic between createServerClient and supabase.auth.getUser().
  // A simple mistake here can make it very hard to debug random log-outs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated user hitting a protected route → /login?next=<path>
  if (!user && startsWithAny(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  // Authenticated user hitting an auth-only route → /dashboard
  if (user && startsWithAny(pathname, AUTH_ONLY_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  return supabaseResponse;
};

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

// Backwards-compatible alias for any older import sites.
export const createClient = updateSession;
