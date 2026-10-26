import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __nutriaPrisma?: PrismaClient;
};

/**
 * Reads `DATABASE_URL` and turns a missing value into an actionable message.
 *
 * @returns The PostgreSQL connection string.
 * @throws {Error} If `DATABASE_URL` is unset or empty.
 */
function readDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. In development it comes from " +
        ".env.development; start PostgreSQL with " +
        "`podman compose -f compose.dev.yaml up -d --wait` (or `docker compose`). " +
        "When self-hosting, compose.yaml sets it for the app container.",
    );
  }

  return url;
}

/**
 * Builds a Prisma client wired to PostgreSQL through the `pg` driver adapter.
 * Prisma 7 has no built-in engine, so the adapter is the only way to connect.
 *
 * @returns A client that has not connected yet; Prisma connects on first query.
 * @throws {Error} If `DATABASE_URL` is unset or empty.
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg(readDatabaseUrl()) });
}

/**
 * Returns the shared Prisma client, building it on first use.
 *
 * The client is memoized on `globalThis` so hot reloads in development reuse
 * the existing connection pool instead of leaking a new one per edit. It is
 * created lazily rather than at module scope because `next build` imports this
 * module without a database to talk to.
 *
 * @returns The process-wide Prisma client.
 * @throws {Error} If `DATABASE_URL` is unset or empty.
 */
export function getPrisma(): PrismaClient {
  globalForPrisma.__nutriaPrisma ??= createPrismaClient();

  return globalForPrisma.__nutriaPrisma;
}
