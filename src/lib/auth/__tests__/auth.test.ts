import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { allowOnlyFirstUser, getAuth } from "@/lib/auth/auth";
import { CLIENT_IP_HEADER } from "@/lib/auth/client-ip";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/limits";
import { getPrisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({ getPrisma: vi.fn() }));
// The real factory would validate the adapter against a live database; the
// suite only checks the options Nutria hands it.
vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({ handler: vi.fn() })),
}));
vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: vi.fn(() => "prisma-adapter"),
}));

const prisma = { user: { count: vi.fn() } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrisma).mockReturnValue(prisma as never);
  delete (globalThis as { __nutriaAuth?: unknown }).__nutriaAuth;
});

describe("allowOnlyFirstUser", () => {
  test("lets the first account through", async () => {
    prisma.user.count.mockResolvedValue(0);

    await expect(allowOnlyFirstUser()).resolves.toBeUndefined();
  });

  test("refuses any account once an owner exists", async () => {
    prisma.user.count.mockResolvedValue(1);

    const error = await allowOnlyFirstUser().catch((caught) => caught);

    expect(error).toBeInstanceOf(APIError);
    expect(error.status).toBe("FORBIDDEN");
  });
});

describe("getAuth", () => {
  test("configures email and password with the shared limits", () => {
    getAuth();

    const options = vi.mocked(betterAuth).mock.calls[0][0];
    expect(options.database).toBe("prisma-adapter");
    expect(options.emailAndPassword).toEqual({
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
    });
    expect(options.advanced?.database?.generateId).toBe("uuid");
  });

  test("guards account creation with the first-user hook", () => {
    getAuth();

    const options = vi.mocked(betterAuth).mock.calls[0][0];
    expect(options.databaseHooks?.user?.create?.before).toBe(
      allowOnlyFirstUser,
    );
  });

  test("keys sign-in rate limiting by the entrypoint's client header", () => {
    getAuth();

    const options = vi.mocked(betterAuth).mock.calls[0][0];
    expect(options.advanced?.ipAddress).toEqual({
      ipAddressHeaders: [CLIENT_IP_HEADER],
    });
  });

  test("builds the instance once and reuses it", () => {
    expect(getAuth()).toBe(getAuth());
    expect(betterAuth).toHaveBeenCalledTimes(1);
  });
});
