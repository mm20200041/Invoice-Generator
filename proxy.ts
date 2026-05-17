import type { NextRequest } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts`.
 * This runs on every matched request and:
 *  - refreshes the Supabase auth cookie,
 *  - redirects unauthenticated requests away from (app)/* routes,
 *  - redirects authenticated requests away from /login and /register.
 *
 * Defense-in-depth: the (app) layout ALSO re-checks the session server-side.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /**
   * Run on every path EXCEPT:
   *  - Next.js internals (`_next/static`, `_next/image`)
   *  - the favicon
   *  - common static asset extensions
   *
   * The Supabase auth callback (`/auth/callback`) intentionally goes through
   * the proxy so the freshly-issued session cookie is written to the response.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
