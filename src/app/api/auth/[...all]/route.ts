import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth/auth";

/**
 * Hands a request to Better Auth. Resolved per request rather than at module
 * scope so `next build` can import the route without a database.
 *
 * @param request The incoming `/api/auth/*` request.
 * @returns Better Auth's response (sign-in, sign-up, sign-out, session, …).
 */
function handle(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

/** Better Auth's HTTP endpoints, mounted under `/api/auth/*`. */
export const { GET, POST } = toNextJsHandler(handle);
