import { IMAGE_HOST_SUFFIXES } from "@/lib/foodfacts/mapping";

/**
 * Sources product thumbnails may load from: exactly the hosts
 * `normalizeImageUrl` accepts, each domain and its subdomains.
 */
const IMAGE_HOSTS = IMAGE_HOST_SUFFIXES.flatMap((suffix) => [
  `https://${suffix}`,
  `https://*.${suffix}`,
]);

/** Request header the proxy hands the per-request nonce to rendering in. */
export const NONCE_HEADER = "x-nonce";

/**
 * Creates the per-request nonce scripts must carry to run.
 *
 * @returns 128 random bits, base64-encoded.
 */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Builds the `Content-Security-Policy` for a page response.
 *
 * Scripts run only with the request's nonce (Next.js attaches it to its own
 * scripts; the root layout to the theme script), and `'strict-dynamic'`
 * extends that trust to the chunks they load. Styles allow `'unsafe-inline'`
 * because React and Base UI set `style` attributes, which a nonce cannot
 * cover. Images may also come from Open Food Facts, for search thumbnails.
 * Nothing may frame the app, and forms post only to it.
 *
 * `upgrade-insecure-requests` is left out on purpose: a self-hosted instance
 * may be served over plain HTTP on a local network, where it would break
 * every asset. HTTPS is the reverse proxy's job.
 *
 * @param nonce Value from {@link createNonce}.
 * @param options `dev` adds `'unsafe-eval'`, which React needs in development
 * to rebuild server error stacks in the browser.
 * @returns The policy, as one header value.
 */
export function buildContentSecurityPolicy(
  nonce: string,
  { dev = false }: { dev?: boolean } = {},
): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${IMAGE_HOSTS.join(" ")}`,
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  return directives.join("; ");
}
