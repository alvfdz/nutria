import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

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
 * @param request The incoming request.
 * @returns A pass-through, a redirect to the login screen, or a 401.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || getSessionCookie(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);

  return NextResponse.redirect(loginUrl);
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
