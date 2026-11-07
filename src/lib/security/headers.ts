/**
 * Response headers sent on every route, static files included, through
 * `headers()` in `next.config.ts`. The `Content-Security-Policy` is not here:
 * it carries a per-request nonce, so `src/proxy.ts` sets it.
 *
 * `Strict-Transport-Security` is not here either. A self-hosted instance may
 * be served over plain HTTP; the reverse proxy that terminates TLS should
 * send it.
 */
export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  // Browsers must not guess a different content type than the one sent.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No site may frame the app (clickjacking). Older browsers' version of
  // the CSP `frame-ancestors 'none'` directive.
  { key: "X-Frame-Options", value: "DENY" },
  // Cross-origin requests, such as Open Food Facts thumbnails, see the
  // origin only, never the page path.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nutria uses none of these device features.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // A page another site opens cannot keep a handle on Nutria's window.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
