import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

import { migrate, readMigrations } from "./migrate.ts";

/**
 * File name a PostgreSQL client looks for inside a socket folder. The number
 * is the default port, which is all it is here: nothing listens on TCP.
 */
const SOCKET_FILE = ".s.PGSQL.5432";

/**
 * Connections the socket server accepts. The app's `pg` pool opens up to 10;
 * PGlite itself runs one query at a time, and the socket server queues the
 * rest and keeps a transaction to the connection that opened it.
 */
const MAX_CONNECTIONS = 20;

/** Where {@link startDatabase} finds and puts things. */
export interface DatabaseOptions {
  /** The app's data folder. The database lives in `pgdata` inside it. */
  dataDir: string;
  /** The `prisma/migrations` folder shipped with the app. */
  migrationsDir: string;
  /**
   * A folder only this user can write to, for the database's socket. Its
   * path must be short: a Unix socket path is limited to about 100 bytes.
   */
  runtimeDir: string;
}

/** The embedded database, running. */
export interface EmbeddedDatabase {
  /** `DATABASE_URL` for the app: the same `pg` driver, over a Unix socket. */
  url: string;
  /** Migrations this start applied, oldest first. */
  applied: string[];
  /**
   * Closes the socket and the database, flushing it to disk.
   *
   * @returns Once both are closed and the socket folder is removed.
   */
  stop(): Promise<void>;
}

/**
 * Starts the desktop app's database: PostgreSQL compiled to WebAssembly
 * (PGlite) storing its files in the data folder, brought up to date with
 * the app's migrations, and served to the app over a Unix socket.
 *
 * A socket in a private folder, rather than a TCP port, keeps the database
 * out of reach of other users and of anything on the network. The app
 * connects to it with the same `@prisma/adapter-pg` it uses against a real
 * server, so there is one schema and one set of queries.
 *
 * Only one process may open a data folder at a time; the app's
 * single-instance lock guarantees it.
 *
 * @param options Folders to use.
 * @returns The running database.
 * @throws {MigrationError} If the migrations cannot be applied.
 * @throws {Error} If the database files or the socket cannot be opened.
 */
export async function startDatabase({
  dataDir,
  migrationsDir,
  runtimeDir,
}: DatabaseOptions): Promise<EmbeddedDatabase> {
  await mkdir(dataDir, { recursive: true });
  await mkdir(runtimeDir, { recursive: true });

  const db = await PGlite.create(path.join(dataDir, "pgdata"));
  let socketDir: string | undefined;

  try {
    const applied = await migrate(db, await readMigrations(migrationsDir));

    // `mkdtemp` creates the folder readable by its owner only.
    socketDir = await mkdtemp(path.join(runtimeDir, "nutria-"));
    const server = new PGLiteSocketServer({
      db,
      path: path.join(socketDir, SOCKET_FILE),
      maxConnections: MAX_CONNECTIONS,
    });
    await server.start();

    const folder = socketDir;
    return {
      url: `postgresql://postgres:postgres@localhost/postgres?host=${encodeURIComponent(folder)}`,
      applied,
      async stop() {
        await server.stop();
        await db.close();
        await rm(folder, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await db.close();
    if (socketDir) await rm(socketDir, { recursive: true, force: true });
    throw error;
  }
}
