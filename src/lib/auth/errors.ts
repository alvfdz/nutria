/** The parts of a Better Auth client error the auth screens look at. */
export type AuthClientError = {
  /** HTTP status of the failed request; `0` when it never got an answer. */
  status: number;
  /** Better Auth's machine-readable error code, when it sent one. */
  code?: string;
  /** Better Auth's own message, when it sent one. */
  message?: string;
};

/** Which screen made the request; decides how an error reads. */
export type AuthScreen = "login" | "setup" | "account";

/**
 * Error code the first-user hook answers a second sign-up with, so the setup
 * screen can tell a closed sign-up apart from any other 403.
 */
export const SIGN_UP_CLOSED = "SIGN_UP_CLOSED";

/**
 * Codes Better Auth's origin check sends when a request or one of its URLs
 * comes from an origin it doesn't trust, most often because `BETTER_AUTH_URL`
 * doesn't match the address in the browser. Better Auth logs each one with
 * the refused value, so the screen keeps that detail to itself and points
 * the host to the server logs.
 */
const UNTRUSTED_ORIGIN_CODES = new Set([
  "INVALID_ORIGIN",
  "CROSS_SITE_NAVIGATION_LOGIN_BLOCKED",
  "INVALID_CALLBACK_URL",
  "INVALID_REDIRECT_URL",
  "INVALID_ERROR_CALLBACK_URL",
  "INVALID_NEW_USER_CALLBACK_URL",
]);

/**
 * Code Better Auth sends when the request carries no `Origin` header, e.g.
 * because a reverse proxy dropped it. Better Auth logs nothing for it, so
 * the screen can't point to the logs.
 */
const MISSING_ORIGIN_CODE = "MISSING_OR_NULL_ORIGIN";

/**
 * Codes for a server-side failure Better Auth answers with a 4xx status, e.g.
 * the database rejecting the new account (422).
 */
const SERVER_FAILURE_CODES = new Set([
  "FAILED_TO_CREATE_USER",
  "FAILED_TO_CREATE_SESSION",
]);

/** Validation codes whose Better Auth message reads fine on screen. */
const VALIDATION_CODES = new Set([
  "PASSWORD_TOO_SHORT",
  "PASSWORD_TOO_LONG",
  "INVALID_EMAIL",
]);

/** Codes that mean the instance already has its one account. */
const OWNER_EXISTS_CODES = new Set([
  SIGN_UP_CLOSED,
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
]);

/** What each screen says when nothing more specific applies. */
const FALLBACK_MESSAGES: Record<AuthScreen, string> = {
  login: "Could not sign in. Please try again.",
  setup: "Could not create the account. Please try again.",
  account: "Could not change the password. Please try again.",
};

/**
 * Turns a failed sign-in, sign-up or password change into the message shown above the form.
 * Errors are told apart by Better Auth's code first, then by status, so an
 * unrelated refusal never borrows another error's message. Sign-in failures
 * stay generic on purpose, so the screen never reveals whether an email has
 * an account.
 *
 * @param error The error the Better Auth client returned, or `{ status: 0 }`
 *   when the request never got an answer.
 * @param screen The screen that made the request.
 * @returns A user-facing message.
 */
export function authErrorMessage(
  error: AuthClientError,
  screen: AuthScreen,
): string {
  if (error.status === 0) {
    return "Could not reach the server. Check your connection and try again.";
  }

  if (error.status === 429) {
    return "Too many attempts. Wait a few seconds and try again.";
  }

  if (error.code && UNTRUSTED_ORIGIN_CODES.has(error.code)) {
    return "The server refused this request. If you host this Nutria instance, check its logs.";
  }

  if (error.code === MISSING_ORIGIN_CODE) {
    return "The server refused this request because the browser didn't say where it came from.";
  }

  if (
    error.status >= 500 ||
    (error.code !== undefined && SERVER_FAILURE_CODES.has(error.code))
  ) {
    return "The server ran into a problem. Try again; if it keeps happening, check the server logs.";
  }

  if (screen === "login" && (error.status === 401 || error.status === 400)) {
    return "Invalid email or password.";
  }

  // The first-user hook closing sign-up, or Better Auth finding the email
  // already registered, e.g. a retry of a setup that did succeed.
  if (screen === "setup" && error.code && OWNER_EXISTS_CODES.has(error.code)) {
    return "This Nutria instance already has an owner. Sign in instead.";
  }

  // Better Auth answers a wrong current password with 400 INVALID_PASSWORD.
  if (screen === "account" && error.code === "INVALID_PASSWORD") {
    return "Current password is incorrect.";
  }

  // The session expired or was revoked while the form was open.
  if (screen === "account" && error.status === 401) {
    return "Your session has expired. Sign in again.";
  }

  // Known validation messages read fine as is; any other Better Auth message
  // may be internal, so it falls through to the screen's own wording.
  if (
    screen !== "login" &&
    error.code !== undefined &&
    VALIDATION_CODES.has(error.code) &&
    error.message
  ) {
    return error.message;
  }

  return FALLBACK_MESSAGES[screen];
}
