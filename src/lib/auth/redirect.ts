/** Where a signed-in user lands when there is no page to send them back to. */
export const DEFAULT_SIGNED_IN_PATH = "/";

/**
 * Validates the `next` query parameter the login screen receives, so signing
 * in can only ever send the browser to a page of this app. Anything that is
 * not a plain same-origin path (`https://…`, protocol-relative `//host`, the
 * `/\host` form some browsers treat the same way, control characters) falls
 * back to {@link DEFAULT_SIGNED_IN_PATH}.
 *
 * @param value The raw `next` value, as read from the query or a form field.
 * @returns A safe path to redirect to after signing in.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_SIGNED_IN_PATH;
  if (!value.startsWith("/")) return DEFAULT_SIGNED_IN_PATH;
  if (value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_SIGNED_IN_PATH;
  // The auth screens themselves are never a useful destination.
  if (/^\/(login|setup)(?:[/?#]|$)/.test(value)) return DEFAULT_SIGNED_IN_PATH;

  return value;
}
