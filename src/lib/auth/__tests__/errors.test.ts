import { describe, expect, test } from "vitest";

import { authErrorMessage } from "@/lib/auth/errors";

describe("authErrorMessage", () => {
  test.each(["login", "setup", "account"] as const)(
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

  test.each([
    [403, "SIGN_UP_CLOSED"],
    [422, "USER_ALREADY_EXISTS"],
    [422, "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"],
  ])("points a %i %s setup refusal to the login screen", (status, code) => {
    expect(authErrorMessage({ status, code }, "setup")).toBe(
      "This Nutria instance already has an owner. Sign in instead.",
    );
  });

  test.each([
    "INVALID_ORIGIN",
    "CROSS_SITE_NAVIGATION_LOGIN_BLOCKED",
    "INVALID_CALLBACK_URL",
    "INVALID_REDIRECT_URL",
    "INVALID_ERROR_CALLBACK_URL",
    "INVALID_NEW_USER_CALLBACK_URL",
  ])("points a %s refusal to the server logs on every screen", (code) => {
    for (const screen of ["login", "setup", "account"] as const) {
      expect(authErrorMessage({ status: 403, code }, screen)).toBe(
        "The server refused this request. If you host this Nutria instance, check its logs.",
      );
    }
  });

  test.each(["login", "setup", "account"] as const)(
    "explains a missing origin on %s without pointing to the logs",
    (screen) => {
      expect(
        authErrorMessage(
          { status: 403, code: "MISSING_OR_NULL_ORIGIN" },
          screen,
        ),
      ).toBe(
        "The server refused this request because the browser didn't say where it came from.",
      );
    },
  );

  test("does not read an unrelated setup 403 as an existing owner", () => {
    expect(
      authErrorMessage({ status: 403, code: "SOMETHING_ELSE" }, "setup"),
    ).toBe("Could not create the account. Please try again.");
  });

  test.each(["login", "setup", "account"] as const)(
    "says the server could not be reached from %s",
    (screen) => {
      expect(authErrorMessage({ status: 0 }, screen)).toBe(
        "Could not reach the server. Check your connection and try again.",
      );
    },
  );

  test.each(["login", "setup", "account"] as const)(
    "points a %s 500 to the logs",
    (screen) => {
      expect(authErrorMessage({ status: 500 }, screen)).toBe(
        "The server ran into a problem. Try again; if it keeps happening, check the server logs.",
      );
    },
  );

  test.each([
    [422, "FAILED_TO_CREATE_USER"],
    [400, "FAILED_TO_CREATE_USER"],
    [400, "FAILED_TO_CREATE_SESSION"],
  ])(
    "reads a setup %i %s as a server failure, not an existing owner",
    (status, code) => {
      expect(
        authErrorMessage(
          { status, code, message: "Failed to create user" },
          "setup",
        ),
      ).toBe(
        "The server ran into a problem. Try again; if it keeps happening, check the server logs.",
      );
    },
  );

  test.each(["PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG", "INVALID_EMAIL"])(
    "passes a setup %s message through",
    (code) => {
      expect(
        authErrorMessage(
          { status: 400, code, message: "Better Auth says" },
          "setup",
        ),
      ).toBe("Better Auth says");
    },
  );

  test.each(["setup", "account"] as const)(
    "keeps an unknown 400 message on %s off the screen",
    (screen) => {
      expect(
        authErrorMessage(
          { status: 400, message: "Invalid origin: expected a string" },
          screen,
        ),
      ).toBe(
        screen === "setup"
          ? "Could not create the account. Please try again."
          : "Could not change the password. Please try again.",
      );
    },
  );

  test("falls back to a generic message per screen", () => {
    expect(authErrorMessage({ status: 403 }, "login")).toBe(
      "Could not sign in. Please try again.",
    );
    expect(authErrorMessage({ status: 400 }, "setup")).toBe(
      "Could not create the account. Please try again.",
    );
  });

  test("names a wrong current password on the account screen", () => {
    expect(
      authErrorMessage(
        { status: 400, code: "INVALID_PASSWORD", message: "Invalid password" },
        "account",
      ),
    ).toBe("Current password is incorrect.");
  });

  test("tells an expired session to sign in again", () => {
    expect(authErrorMessage({ status: 401 }, "account")).toBe(
      "Your session has expired. Sign in again.",
    );
  });

  test("passes an account validation message through", () => {
    expect(
      authErrorMessage(
        {
          status: 400,
          code: "PASSWORD_TOO_SHORT",
          message: "Password too short",
        },
        "account",
      ),
    ).toBe("Password too short");
  });

  test("falls back to a generic account message", () => {
    expect(authErrorMessage({ status: 403 }, "account")).toBe(
      "Could not change the password. Please try again.",
    );
  });
});
