import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import {
  buildContentSecurityPolicy,
  createNonce,
  NONCE_HEADER,
} from "@/lib/security/csp";

/** Screens a signed-out visitor may open: signing in and first-run setup. */
const PUBLIC_PATHS = new Set(["/login", "/setup"]);

/**
 * Optimistic auth gate in front of every route. It only checks that a session
 * cookie is present, never that it is valid: that would cost a database
 * lookup on every request, prefetches included. The authoritative check is
 * `requireUser()` in each page and server action (`src/lib/auth/session.ts`);
 * this just keeps signed-out visitors from rendering app pages at all.
 *
 * Signed-out page requests are redirected to `/login?next=<path>` so signing
 * in returns to where the visitor was heading; API requests get a 401
 * instead, since a redirect means nothing to a `fetch`.
 *
 * It also sets the `Content-Security-Policy`, with a fresh nonce per request.
 * The nonce goes to rendering in the request's own CSP header, where Next.js
 * reads it for its scripts, and in `x-nonce`, where the root layout reads it
 * for the theme script.
 *
 * @param request The incoming request.
 * @returns A pass-through, a redirect to the login screen, or a 401, each
 * carrying the policy.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy(nonce, {
    dev: process.env.NODE_ENV === "development",
  });

  let response: NextResponse;

  if (PUBLIC_PATHS.has(pathname) || getSessionCookie(request)) {
    const headers = new Headers(request.headers);
    headers.set(NONCE_HEADER, nonce);
    headers.set("Content-Security-Policy", policy);
    response = NextResponse.next({ request: { headers } });
  } else if (pathname.startsWith("/api/")) {
    response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(loginUrl);
  }

  response.headers.set("Content-Security-Policy", policy);
  return response;
}

/**
 * Runs the proxy on everything except Better Auth's own endpoints (signing in
 * must work while signed out), Next.js build assets, and static files served
 * from `public/` (any last path segment with an extension). The exclusions
 * end in `/` so a sibling such as `/api/authors` stays gated.
 */
export const config = {
  matcher: ["/((?!api/auth/|_next/static/|_next/image|.*\\.[^/]+$).*)"],
};
