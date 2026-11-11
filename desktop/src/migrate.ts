import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { PGlite } from "@electric-sql/pglite";

/**
 * The table the Prisma CLI records applied migrations in, with the columns
 * it creates. Using the same one keeps a desktop database readable by
 * `prisma migrate deploy`, should it ever move to a server.
 */
const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )
`;

/** A migration folder from `prisma/migrations`. */
export interface Migration {
  /** Folder name, e.g. `20260930200409_init`. Sorting by it gives the order. */
  name: string;
  /** Contents of its `migration.sql`. */
  sql: string;
  /** SHA-256 of the SQL in hex, which is how Prisma checksums a migration. */
  checksum: string;
}

/** Why the database and the app's migrations cannot be reconciled. */
export type MigrationErrorCode =
  /** The database holds migrations this version of the app doesn't have. */
  | "DATABASE_IS_NEWER"
  /** An applied migration no longer matches the file it came from. */
  | "CHECKSUM_MISMATCH"
  /** A migration's SQL failed; it was rolled back. */
  | "MIGRATION_FAILED";

/** Thrown by {@link migrate} when the database cannot be brought up to date. */
export class MigrationError extends Error {
  /** What went wrong, for callers that word their own message. */
  readonly code: MigrationErrorCode;

  /**
   * @param code What went wrong.
   * @param message Explanation naming the migration.
   * @param options The underlying error, as `cause`.
   */
  constructor(
    code: MigrationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "MigrationError";
    this.code = code;
  }
}

/**
 * Reads every migration in a `prisma/migrations` folder, oldest first.
 * Entries that are not migration folders (`migration_lock.toml`) are skipped.
 *
 * @param migrationsDir Path of the folder.
 * @returns The migrations, sorted by name.
 * @throws {Error} If the folder, or a migration's `migration.sql`, can't be
 * read.
 */
export async function readMigrations(
  migrationsDir: string,
): Promise<Migration[]> {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(
        path.join(migrationsDir, name, "migration.sql"),
        "utf8",
      );
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

/**
 * Brings a PGlite database up to date, the way `prisma migrate deploy` does
 * for a server: pending migrations run in order, each in its own
 * transaction together with its row in `_prisma_migrations`, so a failure
 * leaves the database exactly as the last good migration left it.
 *
 * The desktop app calls this on every launch, since it ships without the
 * Prisma CLI.
 *
 * @param db The database to migrate.
 * @param migrations The app's migrations, from {@link readMigrations}.
 * @returns The names of the migrations applied by this call, in order.
 * @throws {MigrationError} `DATABASE_IS_NEWER` when the database was last
 * opened by a newer version of the app, `CHECKSUM_MISMATCH` when an applied
 * migration was edited afterwards, `MIGRATION_FAILED` when a migration's SQL
 * fails.
 */
export async function migrate(
  db: PGlite,
  migrations: readonly Migration[],
): Promise<string[]> {
  await db.exec(CREATE_MIGRATIONS_TABLE);

  const { rows } = await db.query<{ migration_name: string; checksum: string }>(
    `SELECT "migration_name", "checksum" FROM "_prisma_migrations"
     WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`,
  );
  const applied = new Map(
    rows.map((row) => [row.migration_name, row.checksum]),
  );
  const known = new Map(
    migrations.map((migration) => [migration.name, migration]),
  );

  for (const [name, checksum] of applied) {
    const migration = known.get(name);

    if (!migration) {
      throw new MigrationError(
        "DATABASE_IS_NEWER",
        `The database has the migration "${name}", which this version of Nutria doesn't know. It was last opened by a newer version.`,
      );
    }
    if (migration.checksum !== checksum) {
      throw new MigrationError(
        "CHECKSUM_MISMATCH",
        `The migration "${name}" was changed after it was applied to this database.`,
      );
    }
  }

  const ran: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;

    try {
      await db.transaction(async (tx) => {
        await tx.exec(migration.sql);
        await tx.query(
          `INSERT INTO "_prisma_migrations"
             ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
           VALUES ($1, $2, $3, now(), 1)`,
          [randomUUID(), migration.checksum, migration.name],
        );
      });
    } catch (error) {
      throw new MigrationError(
        "MIGRATION_FAILED",
        `The migration "${migration.name}" failed: ${(error as Error).message}`,
        { cause: error },
      );
    }

    ran.push(migration.name);
  }

  return ran;
}
