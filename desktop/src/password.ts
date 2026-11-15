import { randomBytes } from "node:crypto";

import pg from "pg";

import { resetPassword } from "../../src/lib/auth/reset-password.ts";

/**
 * Random bytes in a generated password. Encoded as base64url they make 20
 * characters, above the sign-up minimum and easy to paste.
 */
const PASSWORD_BYTES = 15;

/** Outcome of {@link resetOwnerPassword}. */
export interface OwnerPasswordReset {
  /** Email of the account whose password changed. */
  email: string;
  /** The new password, to show the owner once. */
  password: string;
}

/**
 * Gives the desktop app's owner account a new, generated password, for an
 * owner who forgot theirs. Being able to run the app as the user who owns its
 * data folder is the proof of ownership, as shell access is on a server.
 *
 * It goes through the same `resetPassword` as the self-hosted
 * `reset-password` command, so every session of the account ends too.
 *
 * @param url `DATABASE_URL` of the embedded database.
 * @returns The account's email and its new password.
 * @throws {Error} When the database cannot be reached, no account exists,
 * several accounts exist, or the account has no password.
 */
export async function resetOwnerPassword(
  url: string,
): Promise<OwnerPasswordReset> {
  const password = randomBytes(PASSWORD_BYTES).toString("base64url");
  // One connection, not a pool: the reset runs a transaction through it.
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    const { email } = await resetPassword(client, password);
    return { email, password };
  } finally {
    await client.end();
  }
}
