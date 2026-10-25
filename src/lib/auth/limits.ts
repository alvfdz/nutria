/**
 * Shortest password the setup screen and the sign-up endpoint accept. Nutria
 * guards a single owner account exposed to whatever network it is deployed on,
 * so it asks for more than Better Auth's default of 8.
 */
export const MIN_PASSWORD_LENGTH = 12;

/** Longest password accepted; bounds the cost of hashing a submission. */
export const MAX_PASSWORD_LENGTH = 128;

/** Longest display name accepted for the owner account. */
export const MAX_NAME_LENGTH = 80;
