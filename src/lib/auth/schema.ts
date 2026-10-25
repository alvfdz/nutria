import { z } from "zod";

import {
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "./limits";

/** An email address, trimmed and lower-cased so sign-in is case-insensitive. */
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: "Email is required" })
  .pipe(z.email({ error: "Enter a valid email address" }));

/**
 * Validates the login form. The password is only checked for presence: its
 * length rules belong to account creation, and echoing them on login would
 * hint at what a valid password looks like.
 */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, { error: "Password is required" }),
});

/** Values of a valid login submission. */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Validates the first-run setup form that creates the owner account. The
 * password bounds mirror what Better Auth enforces server-side
 * (`src/lib/auth/auth.ts`), so the user sees them before the request is sent.
 */
export const setupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Name is required" })
      .max(MAX_NAME_LENGTH, {
        error: `Name must be at most ${MAX_NAME_LENGTH} characters`,
      }),
    email: emailField,
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, {
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      })
      .max(MAX_PASSWORD_LENGTH, {
        error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
      }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Values of a valid setup submission. */
export type SetupInput = z.infer<typeof setupSchema>;

/** Validation messages keyed by field name. */
export type AuthFieldErrors<Field extends string> = Partial<
  Record<Field, string[]>
>;

/**
 * Flattens a validation failure into messages keyed by field name, the shape
 * the auth forms render under each input.
 *
 * @param error The failure a schema's `safeParse` returned.
 * @returns The messages, keyed by the top-level field they belong to.
 */
export function authFieldErrors<Field extends string>(
  error: z.ZodError,
): AuthFieldErrors<Field> {
  const fieldErrors: AuthFieldErrors<Field> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "") as Field;
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return fieldErrors;
}
