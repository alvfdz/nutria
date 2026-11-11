import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  migrate,
  MigrationError,
  readMigrations,
  type Migration,
} from "../migrate.ts";

/** The repository's real migrations, the ones the app ships. */
const MIGRATIONS_DIR = fileURLToPath(
  new URL("../../../prisma/migrations", import.meta.url),
);

/** Builds a migration from its SQL, checksummed the way Prisma does. */
function migration(name: string, sql: string): Migration {
  return {
    name,
    sql,
    checksum: createHash("sha256").update(sql).digest("hex"),
  };
}

let db: PGlite;

beforeEach(async () => {
  db = await PGlite.create();
});

afterEach(async () => {
  await db.close();
});

const appliedNames = async () =>
  (
    await db.query<{ migration_name: string }>(
      `SELECT "migration_name" FROM "_prisma_migrations" ORDER BY "migration_name"`,
    )
  ).rows.map((row) => row.migration_name);

describe("readMigrations", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "nutria-migrations-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reads the folders in name order and skips other files", async () => {
    for (const name of ["20260102_second", "20260101_first"]) {
      await mkdir(path.join(dir, name));
      await writeFile(path.join(dir, name, "migration.sql"), `-- ${name}`);
    }
    await writeFile(path.join(dir, "migration_lock.toml"), "provider = x");

    expect(await readMigrations(dir)).toEqual([
      migration("20260101_first", "-- 20260101_first"),
      migration("20260102_second", "-- 20260102_second"),
    ]);
  });

  it("fails when a migration folder has no migration.sql", async () => {
    await mkdir(path.join(dir, "20260101_empty"));

    await expect(readMigrations(dir)).rejects.toThrow(/ENOENT/);
  });

  it("fails when the folder is missing", async () => {
    await expect(readMigrations(path.join(dir, "nope"))).rejects.toThrow(
      /ENOENT/,
    );
  });
});

describe("migrate, with the repository's migrations", () => {
  it("applies every migration to an empty database", async () => {
    const migrations = await readMigrations(MIGRATIONS_DIR);
    expect(migrations.length).toBeGreaterThanOrEqual(9);

    const ran = await migrate(db, migrations);

    expect(ran).toEqual(migrations.map(({ name }) => name));
    expect(await appliedNames()).toEqual(ran);

    const { rows } = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    expect(rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining(["users", "ingredients", "meals", "plan_meals"]),
    );
  });

  it("records each migration the way the Prisma CLI does", async () => {
    const migrations = await readMigrations(MIGRATIONS_DIR);
    await migrate(db, migrations);

    const { rows } = await db.query<{
      id: string;
      checksum: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
      applied_steps_count: number;
    }>(`SELECT * FROM "_prisma_migrations" WHERE "migration_name" = $1`, [
      migrations[0].name,
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rows[0].checksum).toBe(migrations[0].checksum);
    expect(rows[0].finished_at).toBeInstanceOf(Date);
    expect(rows[0].rolled_back_at).toBeNull();
    expect(rows[0].applied_steps_count).toBe(1);
  });

  it("does nothing on a database that is already up to date", async () => {
    const migrations = await readMigrations(MIGRATIONS_DIR);
    await migrate(db, migrations);

    expect(await migrate(db, migrations)).toEqual([]);
    expect(await appliedNames()).toHaveLength(migrations.length);
  });

  it("applies only what is new after an update", async () => {
    const migrations = await readMigrations(MIGRATIONS_DIR);
    await migrate(db, migrations.slice(0, -2));

    expect(await migrate(db, migrations)).toEqual(
      migrations.slice(-2).map(({ name }) => name),
    );
  });

  it("keeps the one-account limit: the trigger refuses a second user", async () => {
    await migrate(db, await readMigrations(MIGRATIONS_DIR));
    const insertUser = (email: string) =>
      db.query(
        `INSERT INTO "users" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'Owner', $1, false, now(), now())`,
        [email],
      );

    await insertUser("first@example.com");

    await expect(insertUser("second@example.com")).rejects.toThrow(
      /Sign-up is closed/,
    );
  });
});

describe("migrate, when something is wrong", () => {
  const first = migration("0001_first", `CREATE TABLE "a" ("id" INT)`);

  it("rolls a failing migration back and leaves earlier ones applied", async () => {
    const broken = migration(
      "0002_broken",
      `CREATE TABLE "b" ("id" INT); SELECT * FROM "missing";`,
    );

    const error = await migrate(db, [first, broken]).catch((e) => e);

    expect(error).toBeInstanceOf(MigrationError);
    expect(error.code).toBe("MIGRATION_FAILED");
    expect(error.message).toContain("0002_broken");
    expect(error.cause).toBeInstanceOf(Error);
    expect(await appliedNames()).toEqual(["0001_first"]);
    await expect(db.query(`SELECT * FROM "b"`)).rejects.toThrow();
  });

  it("retries a migration that failed once it is fixed", async () => {
    await migrate(db, [
      first,
      migration("0002_next", `SELECT * FROM "x"`),
    ]).catch(() => {});

    const fixed = migration("0002_next", `CREATE TABLE "x" ("id" INT)`);

    expect(await migrate(db, [first, fixed])).toEqual(["0002_next"]);
  });

  it("refuses a database a newer version of the app has migrated", async () => {
    await migrate(db, [first, migration("0002_future", `CREATE TABLE "f" ()`)]);

    const error = await migrate(db, [first]).catch((e) => e);

    expect(error).toBeInstanceOf(MigrationError);
    expect(error.code).toBe("DATABASE_IS_NEWER");
    expect(error.message).toContain("0002_future");
  });

  it("refuses an applied migration whose SQL changed afterwards", async () => {
    await migrate(db, [first]);

    const error = await migrate(db, [
      migration("0001_first", `CREATE TABLE "a" ("id" BIGINT)`),
    ]).catch((e) => e);

    expect(error).toBeInstanceOf(MigrationError);
    expect(error.code).toBe("CHECKSUM_MISMATCH");
  });

  it("ignores rows the Prisma CLI marked as rolled back", async () => {
    await migrate(db, [first]);
    await db.query(
      `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "rolled_back_at")
       VALUES ('x', 'stale', '0002_retry', now())`,
    );

    expect(
      await migrate(db, [
        first,
        migration("0002_retry", `CREATE TABLE "r" ()`),
      ]),
    ).toEqual(["0002_retry"]);
  });
});
