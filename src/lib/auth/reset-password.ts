import { hashPassword } from "better-auth/crypto";

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./limits.ts";

/**
 * The slice of a `pg` client the reset needs. Keeping it this small lets the
 * command-line script hand over a plain connection and the tests a stub. It
 * must be a single connection (a `pg.Client`), not a pool: the reset runs
 * `BEGIN` and `COMMIT` through it, and a pool would send them to different
 * connections.
 */
export type ResetDb = {
  /** Runs one parameterised statement. */
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
};

/** Outcome of a successful reset. */
export type ResetPasswordResult = {
  /** Email of the account whose password changed. */
  email: string;
  /** How many signed-in sessions were ended. */
  revokedSessions: number;
};

/**
 * Sets a new password for an account straight in the database, for an owner
 * who is locked out: Nutria sends no email, so there is no "forgot password"
 * link. It runs with shell access to the deployment, which is the proof of
 * ownership, and it deliberately skips Better Auth's HTTP layer (and its rate
 * limiter) for that reason.
 *
 * The password is hashed with Better Auth's own scrypt helper so sign-in
 * accepts it, and every session of the account is deleted so a stolen cookie
 * does not outlive the reset. Both writes happen in one transaction.
 *
 * @param db Connection to the Nutria database.
 * @param password The new password, within the length limits of sign-up.
 * @param email Account to reset; may be omitted while exactly one account
 * exists.
 * @returns The email that was reset and the number of sessions ended.
 * @throws {Error} When the password is too short or long, no account matches,
 * several accounts exist and no email was given, or the account has no
 * password credential.
 */
export async function resetPassword(
  db: ResetDb,
  password: string,
  email?: string,
): Promise<ResetPasswordResult> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
    );
  }

  const user = await findUser(db, email?.trim().toLowerCase());
  const hash = await hashPassword(password);

  await db.query("BEGIN");

  try {
    const updated = await db.query(
      `UPDATE accounts SET password = $1, "updatedAt" = now()
       WHERE "userId" = $2 AND "providerId" = 'credential'`,
      [hash, user.id],
    );

    if (!updated.rowCount) {
      throw new Error(`${user.email} has no password to reset.`);
    }

    const revoked = await db.query(`DELETE FROM sessions WHERE "userId" = $1`, [
      user.id,
    ]);

    await db.query("COMMIT");

    return { email: user.email, revokedSessions: revoked.rowCount ?? 0 };
  } catch (error) {
    // A dropped connection fails the rollback too; keep the original cause.
    await db.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

/**
 * Resolves the account to reset.
 *
 * @param db Connection to the Nutria database.
 * @param email Normalised email, or `undefined` to pick the only account.
 * @returns The matching account's id and email.
 * @throws {Error} When nothing matches or the choice is ambiguous.
 */
async function findUser(
  db: ResetDb,
  email: string | undefined,
): Promise<{ id: string; email: string }> {
  const { rows } = email
    ? await db.query(`SELECT id, email FROM users WHERE email = $1`, [email])
    : await db.query(`SELECT id, email FROM users LIMIT 2`);

  if (rows.length === 0) {
    throw new Error(
      email ? `No account with email ${email}.` : "No account exists yet.",
    );
  }

  if (rows.length > 1) {
    throw new Error("Several accounts exist: pass the email to reset.");
  }

  const [{ id, email: found }] = rows as { id: string; email: string }[];

  return { id, email: found };
}
