import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client. It talks to `/api/auth/*` on the current
 * origin, so it needs no base URL; the login, setup and sign-out controls use
 * it so every attempt goes through Better Auth's rate limiter.
 */
export const authClient = createAuthClient();
