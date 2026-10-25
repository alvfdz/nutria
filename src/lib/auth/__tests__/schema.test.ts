import { describe, expect, test } from "vitest";

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/limits";
import { authFieldErrors, loginSchema, setupSchema } from "@/lib/auth/schema";

const validSetup = {
  name: "Owner",
  email: "owner@example.com",
  password: "a".repeat(MIN_PASSWORD_LENGTH),
  confirmPassword: "a".repeat(MIN_PASSWORD_LENGTH),
};

/** Parses a setup submission and returns its per-field messages. */
function setupErrors(overrides: Partial<typeof validSetup>) {
  const result = setupSchema.safeParse({ ...validSetup, ...overrides });
  if (result.success) throw new Error("expected the setup to be rejected");

  return authFieldErrors(result.error);
}

describe("loginSchema", () => {
  test("normalizes the email", () => {
    expect(
      loginSchema.parse({ email: "  Owner@Example.COM ", password: "x" }),
    ).toEqual({ email: "owner@example.com", password: "x" });
  });

  test("accepts a short password, leaving length rules to account creation", () => {
    expect(
      loginSchema.safeParse({ email: "owner@example.com", password: "x" })
        .success,
    ).toBe(true);
  });

  test("requires both fields", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });
    if (result.success) throw new Error("expected a failure");

    expect(authFieldErrors(result.error)).toEqual({
      email: ["Email is required"],
      password: ["Password is required"],
    });
  });

  test("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "owner", password: "x" });
    if (result.success) throw new Error("expected a failure");

    expect(authFieldErrors(result.error).email).toEqual([
      "Enter a valid email address",
    ]);
  });

  test("rejects a missing field from FormData", () => {
    expect(loginSchema.safeParse({ email: null, password: null }).success).toBe(
      false,
    );
  });
});

describe("setupSchema", () => {
  test("accepts a valid owner account and trims the name", () => {
    expect(setupSchema.parse({ ...validSetup, name: "  Owner " }).name).toBe(
      "Owner",
    );
  });

  test("accepts a password at exactly the minimum length", () => {
    expect(setupSchema.safeParse(validSetup).success).toBe(true);
  });

  test("rejects a password below the minimum length", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);

    expect(
      setupErrors({ password: short, confirmPassword: short }).password,
    ).toEqual([`Password must be at least ${MIN_PASSWORD_LENGTH} characters`]);
  });

  test("rejects a password above the maximum length", () => {
    const long = "a".repeat(MAX_PASSWORD_LENGTH + 1);

    expect(
      setupErrors({ password: long, confirmPassword: long }).password,
    ).toEqual([`Password must be at most ${MAX_PASSWORD_LENGTH} characters`]);
  });

  test("reports a mismatched confirmation under the confirmation field", () => {
    expect(
      setupErrors({ confirmPassword: "b".repeat(MIN_PASSWORD_LENGTH) }),
    ).toEqual({ confirmPassword: ["Passwords do not match"] });
  });

  test("requires a name", () => {
    expect(setupErrors({ name: "   " }).name).toEqual(["Name is required"]);
  });

  test("rejects an over-long name", () => {
    expect(setupErrors({ name: "a".repeat(81) }).name).toEqual([
      "Name must be at most 80 characters",
    ]);
  });
});
