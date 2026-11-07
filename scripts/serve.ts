/**
 * The container's entrypoint: starts Nutria's standalone server with each
 * request stamped with the client address its connection really comes from
 * (`src/lib/auth/client-ip.ts`), which sign-in rate limiting keys by.
 *
 * `TRUSTED_PROXIES` is read and checked here, before the server starts, so
 * an invalid entry stops the container instead of breaking every request.
 *
 * It runs from its TypeScript source on Node's built-in type stripping. The
 * image copies it to `/app/scripts/`, next to the standalone `server.js`.
 */
import http from "node:http";

import {
  installClientIpHeader,
  parseTrustedProxies,
} from "../src/lib/auth/client-ip.ts";

let trusted;
try {
  trusted = parseTrustedProxies(process.env.TRUSTED_PROXIES);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

if (trusted.entries.length > 0) {
  console.log(`Trusting X-Forwarded-For from: ${trusted.entries.join(", ")}`);
}

installClientIpHeader(trusted, http.Server.prototype);

await import(new URL("../server.js", import.meta.url).href);
