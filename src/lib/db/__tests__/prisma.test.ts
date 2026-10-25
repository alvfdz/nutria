import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// `getPrisma` memoizes on `globalThis`, so each test starts from a clean slate
// by re-importing the module after resetting the module registry.
const globalPrisma = globalThis as typeof globalThis & {
  __nutriaPrisma?: unknown;
};

/**
 * Re-imports the module under test with a fresh `globalThis` slot, so a client
 * cached by a previous test cannot leak into this one.
 *
 * @returns A `getPrisma` bound to a module instance nothing else has used.
 */
async function importFreshGetPrisma() {
  vi.resetModules();
  delete globalPrisma.__nutriaPrisma;

  const prismaModule = await import("@/lib/db/prisma");

  return prismaModule.getPrisma;
}

beforeEach(() => {
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://nutria:nutria@127.0.0.1:5432/nutria",
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete globalPrisma.__nutriaPrisma;
});

describe("getPrisma", () => {
  test("returns a usable client when DATABASE_URL is set", async () => {
    const getPrismaFresh = await importFreshGetPrisma();

    const client = getPrismaFresh();

    expect(client).toBeDefined();
    expect(typeof client.ingredient.create).toBe("function");
  });

  test("hands back the same instance so the pool survives hot reloads", async () => {
    const getPrismaFresh = await importFreshGetPrisma();

    expect(getPrismaFresh()).toBe(getPrismaFresh());
  });

  test("reuses a client another caller already cached", async () => {
    const getPrismaFresh = await importFreshGetPrisma();
    const first = getPrismaFresh();

    // A second module instance (what a hot reload gives us) sees the same slot.
    vi.resetModules();
    const { getPrisma: reloaded } = await import("@/lib/db/prisma");

    expect(reloaded()).toBe(first);
  });

  test("explains how to fix a missing DATABASE_URL instead of failing in pg", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const getPrismaFresh = await importFreshGetPrisma();

    expect(getPrismaFresh).toThrow(/DATABASE_URL is not set/);
  });

  test("names both compose commands so the fix is unambiguous", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const getPrismaFresh = await importFreshGetPrisma();

    expect(getPrismaFresh).toThrow(/podman compose up -d --wait postgres/);
    expect(getPrismaFresh).toThrow(/docker compose/);
  });

  test("does not connect while being built", async () => {
    // A wrong host would hang or reject if the constructor opened a socket.
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://nobody:nobody@127.0.0.1:1/unreachable",
    );
    const getPrismaFresh = await importFreshGetPrisma();

    expect(() => getPrismaFresh()).not.toThrow();
  });
});
