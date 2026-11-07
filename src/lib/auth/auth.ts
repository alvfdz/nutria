import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";

import { getPrisma } from "@/lib/db/prisma";
import { CLIENT_IP_HEADER } from "./client-ip";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./limits";

/**
 * Better Auth `databaseHooks.user.create.before` hook that keeps Nutria
 * single-tenant: the first account (created from the setup screen) goes
 * through, every later sign-up is refused. It runs on the database write
 * itself, so no route to `/api/auth/sign-up/email` (the setup screen or a
 * hand-crafted request) can add a second account.
 *
 * @throws {APIError} `FORBIDDEN` when an account already exists.
 */
export async function allowOnlyFirstUser(): Promise<void> {
  const existing = await getPrisma().user.count();

  if (existing > 0) {
    throw new APIError("FORBIDDEN", {
      message: "Sign-up is closed: this Nutria instance already has an owner.",
    });
  }
}

/**
 * Builds the Better Auth instance: email and password credentials stored
 * through the Prisma adapter, and UUID ids so auth rows follow the same id
 * convention as the rest of the schema.
 *
 * The auth screens call the HTTP endpoints through `authClient` rather than
 * `auth.api.*` from server actions on purpose: Better Auth's rate limiter (on
 * by default in production, 3 sign-in attempts per 10 s) only guards the HTTP
 * router.
 *
 * `BETTER_AUTH_SECRET` (cookie signing) and `BETTER_AUTH_URL` (public origin)
 * are read from the environment by Better Auth itself.
 *
 * The rate limiter keys clients by {@link CLIENT_IP_HEADER}, which the
 * container's entrypoint sets from the connection itself, never by
 * `X-Forwarded-For`, which a client can forge. Without the header (`next
 * dev`, `next start`) Better Auth uses one shared bucket in production.
 */
function createAuth() {
  return betterAuth({
    database: prismaAdapter(getPrisma(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
    },
    advanced: {
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    databaseHooks: {
      user: { create: { before: allowOnlyFirstUser } },
    },
  });
}

/** The configured Better Auth instance. */
export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as typeof globalThis & {
  __nutriaAuth?: Auth;
};

/**
 * Returns the shared Better Auth instance, building it on first use.
 *
 * Lazy and memoized for the same reasons as `getPrisma()`: `next build`
 * imports this module without a database, and hot reloads should reuse the
 * instance rather than rebuild it per edit.
 *
 * @returns The process-wide Better Auth instance.
 * @throws {Error} If `DATABASE_URL` is unset or empty.
 */
export function getAuth(): Auth {
  globalForAuth.__nutriaAuth ??= createAuth();

  return globalForAuth.__nutriaAuth;
}
