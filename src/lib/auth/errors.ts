/** The parts of a Better Auth client error the auth screens look at. */
export type AuthClientError = {
  /** HTTP status of the failed request. */
  status: number;
  /** Better Auth's machine-readable error code, when it sent one. */
  code?: string;
  /** Better Auth's own message, when it sent one. */
  message?: string;
};

/** Which screen made the request; decides how a 401/403 reads. */
export type AuthScreen = "login" | "setup";

/**
 * Turns a failed sign-in or sign-up into the message shown above the form.
 * Sign-in failures stay generic on purpose, so the screen never reveals
 * whether an email has an account.
 *
 * @param error The error the Better Auth client returned.
 * @param screen The screen that made the request.
 * @returns A user-facing message.
 */
export function authErrorMessage(
  error: AuthClientError,
  screen: AuthScreen,
): string {
  if (error.status === 429) {
    return "Too many attempts. Wait a few seconds and try again.";
  }

  if (screen === "login" && (error.status === 401 || error.status === 400)) {
    return "Invalid email or password.";
  }

  // 403 is the first-user hook closing sign-up; 422 is Better Auth finding
  // the email already registered, e.g. a retry of a setup that did succeed.
  if (screen === "setup" && (error.status === 403 || error.status === 422)) {
    return "This Nutria instance already has an owner. Sign in instead.";
  }

  if (screen === "setup" && error.status === 400 && error.message) {
    return error.message;
  }

  return screen === "login"
    ? "Could not sign in. Please try again."
    : "Could not create the account. Please try again.";
}
