import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyPassword } from "better-auth/crypto";
import pg from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startDatabase, type EmbeddedDatabase } from "../database.ts";
import { resetOwnerPassword } from "../password.ts";

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../../../prisma/migrations", import.meta.url),
);

let root: string;
let database: EmbeddedDatabase;
let pool: pg.Pool;

/**
 * Adds an account with a password and a signed-in session, as sign-up does.
 *
 * @param email The account's email.
 * @returns The account's user id.
 */
async function addOwner(email: string): Promise<string> {
  const {
    rows: [{ id }],
  } = await pool.query(
    `INSERT INTO "users" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), 'Owner', $1, false, now(), now()) RETURNING "id"`,
    [email],
  );
  await pool.query(
    `INSERT INTO "accounts" ("id", "accountId", "providerId", "userId", "password", "updatedAt")
     VALUES (gen_random_uuid(), $1::text, 'credential', $1::uuid, 'old-hash', now())`,
    [id],
  );
  await pool.query(
    `INSERT INTO "sessions" ("id", "expiresAt", "token", "userId", "updatedAt")
     VALUES (gen_random_uuid(), now() + interval '1 day', $2, $1, now())`,
    [id, `token-${id}`],
  );
  return id;
}

beforeEach(async () => {
  // Kept short on purpose: a Unix socket path is limited to ~100 bytes.
  root = await mkdtemp(path.join(os.tmpdir(), "npw-"));
  database = await startDatabase({
    dataDir: path.join(root, "data"),
    migrationsDir: MIGRATIONS_DIR,
    runtimeDir: path.join(root, "run"),
  });
  pool = new pg.Pool({ connectionString: database.url });
});

afterEach(async () => {
  await pool.end();
  await database.stop();
  // Windows releases a closed file's lock a moment late.
  await rm(root, { recursive: true, force: true, maxRetries: 10 });
});

describe("resetOwnerPassword", () => {
  it("sets a generated password sign-in accepts and ends the sessions", async () => {
    const id = await addOwner("owner@example.com");

    const { email, password } = await resetOwnerPassword(database.url);

    expect(email).toBe("owner@example.com");
    expect(password).toMatch(/^[\w-]{20}$/);

    const {
      rows: [{ password: hash }],
    } = await pool.query(
      `SELECT "password" FROM "accounts" WHERE "userId" = $1`,
      [id],
    );
    expect(await verifyPassword({ hash, password })).toBe(true);

    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM "sessions" WHERE "userId" = $1`,
      [id],
    );
    expect(rows).toEqual([{ n: 0 }]);
  });

  it("generates a different password each time", async () => {
    await addOwner("owner@example.com");

    const first = await resetOwnerPassword(database.url);
    const second = await resetOwnerPassword(database.url);

    expect(second.password).not.toBe(first.password);
  });

  it("fails when no account exists yet", async () => {
    await expect(resetOwnerPassword(database.url)).rejects.toThrow(
      "No account exists yet.",
    );
  });

  it("fails, keeping the sessions, when the account has no password", async () => {
    const id = await addOwner("owner@example.com");
    await pool.query(`DELETE FROM "accounts" WHERE "userId" = $1`, [id]);

    await expect(resetOwnerPassword(database.url)).rejects.toThrow(
      "owner@example.com has no password to reset.",
    );

    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM "sessions" WHERE "userId" = $1`,
      [id],
    );
    expect(rows).toEqual([{ n: 1 }]);
  });
});
