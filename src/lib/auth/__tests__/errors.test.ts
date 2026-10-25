import { describe, expect, test } from "vitest";

import { authErrorMessage } from "@/lib/auth/errors";

describe("authErrorMessage", () => {
  test.each(["login", "setup"] as const)(
    "explains a rate-limited %s attempt",
    (screen) => {
      expect(authErrorMessage({ status: 429 }, screen)).toBe(
        "Too many attempts. Wait a few seconds and try again.",
      );
    },
  );

  test.each([401, 400])(
    "keeps a %i sign-in failure generic, whatever the server said",
    (status) => {
      expect(
        authErrorMessage(
          {
            status,
            code: "INVALID_EMAIL_OR_PASSWORD",
            message: "User not found",
          },
          "login",
        ),
      ).toBe("Invalid email or password.");
    },
  );

  test.each([403, 422])(
    "points a %i setup refusal to the login screen",
    (status) => {
      expect(
        authErrorMessage(
          {
            status,
            code: "USER_ALREADY_EXISTS",
            message: "User already exists",
          },
          "setup",
        ),
      ).toBe("This Nutria instance already has an owner. Sign in instead.");
    },
  );

  test("passes a setup validation message through", () => {
    expect(
      authErrorMessage({ status: 400, message: "Password too short" }, "setup"),
    ).toBe("Password too short");
  });

  test("falls back to a generic message per screen", () => {
    expect(authErrorMessage({ status: 500 }, "login")).toBe(
      "Could not sign in. Please try again.",
    );
    expect(authErrorMessage({ status: 400 }, "setup")).toBe(
      "Could not create the account. Please try again.",
    );
  });
});
