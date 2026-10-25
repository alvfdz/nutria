import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { getAuth } from "@/lib/auth/auth";
import { getCurrentUser, hasAnyUser, requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { testUser } from "@test/factories";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/auth", () => ({ getAuth: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: vi.fn() }));

const getSession = vi.fn();
const prisma = { user: { count: vi.fn() } };
const requestHeaders = new Headers({ cookie: "better-auth.session_token=x" });

/** A session as Better Auth returns it, with fields the app must not leak. */
function session() {
  return {
    session: { id: "session-1", token: "secret-token", userId: testUser.id },
    user: { ...testUser, emailVerified: false, image: null },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuth).mockReturnValue({ api: { getSession } } as never);
  vi.mocked(getPrisma).mockReturnValue(prisma as never);
  vi.mocked(headers).mockResolvedValue(requestHeaders as never);
});

describe("getCurrentUser", () => {
  test("validates the request's cookie with Better Auth", async () => {
    getSession.mockResolvedValue(session());

    await getCurrentUser();

    expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  test("returns only the id, email and name of the user", async () => {
    getSession.mockResolvedValue(session());

    await expect(getCurrentUser()).resolves.toEqual(testUser);
  });

  test("returns null without a valid session", async () => {
    getSession.mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe("requireUser", () => {
  test("returns the signed-in user", async () => {
    getSession.mockResolvedValue(session());

    await expect(requireUser()).resolves.toEqual(testUser);
    expect(redirect).not.toHaveBeenCalled();
  });

  test("redirects a signed-out request to the login screen", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

describe("hasAnyUser", () => {
  test("is false on a fresh install", async () => {
    prisma.user.count.mockResolvedValue(0);

    await expect(hasAnyUser()).resolves.toBe(false);
  });

  test("is true once the owner exists", async () => {
    prisma.user.count.mockResolvedValue(1);

    await expect(hasAnyUser()).resolves.toBe(true);
  });

  test("opts out of prerendering before querying", async () => {
    prisma.user.count.mockResolvedValue(0);

    await hasAnyUser();

    expect(connection).toHaveBeenCalled();
  });
});
