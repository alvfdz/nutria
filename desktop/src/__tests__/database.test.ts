import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startDatabase, type EmbeddedDatabase } from "../database.ts";
import { MigrationError } from "../migrate.ts";

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../../../prisma/migrations", import.meta.url),
);

let root: string;
let database: EmbeddedDatabase | undefined;
let pool: pg.Pool | undefined;

/** Starts the database on the test's folders. */
async function start(
  migrationsDir = MIGRATIONS_DIR,
): Promise<EmbeddedDatabase> {
  database = await startDatabase({
    dataDir: path.join(root, "data"),
    migrationsDir,
    runtimeDir: path.join(root, "run"),
  });
  return database;
}

/** Connects the way the app does: a `pg` pool on `DATABASE_URL`. */
function connect(url: string): pg.Pool {
  pool = new pg.Pool({ connectionString: url });
  return pool;
}

const insertOwner = `
  INSERT INTO "users" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Owner', 'owner@example.com', false, now(), now())
`;

beforeEach(async () => {
  // Kept short on purpose: a Unix socket path is limited to ~100 bytes.
  root = await mkdtemp(path.join(os.tmpdir(), "ndb-"));
});

afterEach(async () => {
  await pool?.end();
  pool = undefined;
  await database?.stop();
  database = undefined;
  await rm(root, { recursive: true, force: true });
});

describe("startDatabase", () => {
  it("migrates a new data folder and reports what it applied", async () => {
    const { applied } = await start();

    expect(applied.length).toBeGreaterThanOrEqual(9);
    expect((await stat(path.join(root, "data", "pgdata"))).isDirectory()).toBe(
      true,
    );
  });

  it("serves the app's driver over a socket only its owner can reach", async () => {
    const { url } = await start();

    const { rows } = await connect(url).query(
      `SELECT count(*)::int AS n FROM "users"`,
    );
    expect(rows).toEqual([{ n: 0 }]);

    const [socketDir] = await readdir(path.join(root, "run"));
    const { mode } = await stat(path.join(root, "run", socketDir));
    expect(mode & 0o777).toBe(0o700);
    expect(url).not.toMatch(/:\d+\//);
  });

  it("answers a pool's concurrent connections", async () => {
    const { url } = await start();
    const client = connect(url);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        client.query(`SELECT $1::int AS n`, [index]),
      ),
    );

    expect(results.map(({ rows }) => rows[0].n)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it("keeps a transaction to its own connection", async () => {
    const { url } = await start();
    const client = connect(url);

    const inTransaction = await client.connect();
    await inTransaction.query("BEGIN");
    await inTransaction.query(insertOwner);

    // Another connection's query waits for the transaction instead of
    // running inside it, so a rollback takes back exactly its own work.
    const outside = client.query(`SELECT count(*)::int AS n FROM "users"`);
    await inTransaction.query("ROLLBACK");
    inTransaction.release();

    expect((await outside).rows).toEqual([{ n: 0 }]);
  });

  it("keeps the data across a restart", async () => {
    const first = await start();
    await connect(first.url).query(insertOwner);
    await pool!.end();
    pool = undefined;
    await first.stop();

    const second = await start();

    expect(second.applied).toEqual([]);
    const { rows } = await connect(second.url).query(
      `SELECT "email" FROM "users"`,
    );
    expect(rows).toEqual([{ email: "owner@example.com" }]);
  });

  it("removes its socket folder when stopped", async () => {
    const running = await start();

    await running.stop();
    database = undefined;

    expect(await readdir(path.join(root, "run"))).toEqual([]);
  });

  it("closes the database when the migrations can't be applied", async () => {
    const first = await start();
    await first.stop();

    // An app older than its data: none of the applied migrations are known.
    const empty = path.join(root, "no-migrations");
    await mkdir(empty);

    await expect(start(empty)).rejects.toBeInstanceOf(MigrationError);
    database = undefined;

    // The folder is free again: a second open would fail were it still held.
    await expect(start()).resolves.toMatchObject({ applied: [] });
  });
});
