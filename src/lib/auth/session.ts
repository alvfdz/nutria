import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { getPrisma } from "@/lib/db/prisma";
import { getAuth } from "./auth";
import type { AuthUser } from "./types";

/**
 * Reads the session of the current request, validating the cookie against the
 * `sessions` table. Memoized per render pass with React's `cache`, so a layout
 * and the page under it share one lookup.
 *
 * This is the authoritative check; `src/proxy.ts` only looks for the cookie.
 *
 * @returns The signed-in user, or `null` when the request has no valid
 * session.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  // Read the headers before touching Better Auth: `headers()` is what opts the
  // route out of prerendering, so `next build` never builds the instance (and
  // never needs a database).
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });

  if (!session) return null;

  const { id, email, name } = session.user;

  return { id, email, name };
});

/**
 * Guards a page, layout or server action: returns the signed-in user, or sends
 * the request to the login screen. Every read and write of user data goes
 * through this, and the returned id scopes the repository calls.
 *
 * @returns The signed-in user.
 * @throws The `redirect("/login")` control-flow error when signed out.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return user;
}

/**
 * Tells whether the owner account has been created yet. The login and setup
 * screens use it to send a fresh install to `/setup` and close `/setup`
 * afterwards.
 *
 * @returns `true` once at least one account exists.
 */
export async function hasAnyUser(): Promise<boolean> {
  // Without a Request-time API the setup page would be prerendered at build
  // time and freeze the answer into the output.
  await connection();

  return (await getPrisma().user.count()) > 0;
}
