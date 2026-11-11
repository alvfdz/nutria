import { randomUUID } from "node:crypto";
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

/** Where the database listens, and how the app's driver is pointed at it. */
export interface Endpoint {
  /** What the socket server listens on. */
  listenPath: string;
  /**
   * The `host` the `pg` driver is given. It treats a host starting with `/`
   * as a folder and connects to the {@link SOCKET_FILE} inside it.
   */
  host: string;
  /**
   * Removes what {@link Endpoint.listenPath} left on disk, if anything.
   *
   * @returns Once it is gone.
   */
  remove(): Promise<void>;
}

/**
 * The endpoint on Linux and macOS: a Unix socket in a new folder only its
 * owner can enter.
 *
 * @param runtimeDir Folder to create the socket's folder in.
 * @returns The endpoint.
 * @throws {Error} If the folder cannot be created.
 */
export async function unixSocketEndpoint(
  runtimeDir: string,
): Promise<Endpoint> {
  await mkdir(runtimeDir, { recursive: true });
  // `mkdtemp` creates the folder readable by its owner only.
  const folder = await mkdtemp(path.join(runtimeDir, "nutria-"));

  return {
    listenPath: path.join(folder, SOCKET_FILE),
    host: folder,
    remove: () => rm(folder, { recursive: true, force: true }),
  };
}

/**
 * The endpoint on Windows, which has no Unix sockets in Node.js: a named
 * pipe. Windows lets only the user who created a pipe (and administrators)
 * write to it, and it is not reachable from the network, so it protects the
 * database the way the private folder does elsewhere.
 *
 * The driver only takes the socket route for a host starting with `/`, so it
 * is given the pipe's name with forward slashes, which Windows reads the
 * same as backslashes: both end at `\\.\pipe\<name>\.s.PGSQL.5432`.
 *
 * @param name The pipe's name, unique to this start of the app.
 * @returns The endpoint. A pipe disappears with its server: nothing to remove.
 */
export function namedPipeEndpoint(name: string): Endpoint {
  return {
    listenPath: `\\\\.\\pipe\\${name}\\${SOCKET_FILE}`,
    host: `//./pipe/${name}`,
    remove: async () => {},
  };
}

/** Where {@link startDatabase} finds and puts things. */
export interface DatabaseOptions {
  /** The app's data folder. The database lives in `pgdata` inside it. */
  dataDir: string;
  /** The `prisma/migrations` folder shipped with the app. */
  migrationsDir: string;
  /**
   * A folder only this user can write to, for the database's socket. Its
   * path must be short: a Unix socket path is limited to about 100 bytes.
   * Unused on Windows, where the socket is a named pipe.
   */
  runtimeDir: string;
  /** The system to behave as; the one it runs on unless a test says otherwise. */
  platform?: NodeJS.Platform;
}

/** The embedded database, running. */
export interface EmbeddedDatabase {
  /**
   * `DATABASE_URL` for the app: the same `pg` driver, over a Unix socket or,
   * on Windows, a named pipe. Never a TCP port.
   */
  url: string;
  /** Migrations this start applied, oldest first. */
  applied: string[];
  /**
   * Closes the socket and the database, flushing it to disk.
   *
   * @returns Once both are closed and the socket is removed.
   */
  stop(): Promise<void>;
}

/**
 * Starts the desktop app's database: PostgreSQL compiled to WebAssembly
 * (PGlite) storing its files in the data folder, brought up to date with
 * the app's migrations, and served to the app over a Unix socket (a named
 * pipe on Windows).
 *
 * The database asks for no password, so it must not listen on a TCP port,
 * which any program and any user of the computer could connect to. A socket
 * in a private folder, or a pipe, keeps it to the user running the app. The app
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
  platform = process.platform,
}: DatabaseOptions): Promise<EmbeddedDatabase> {
  await mkdir(dataDir, { recursive: true });

  const db = await PGlite.create(path.join(dataDir, "pgdata"));
  let endpoint: Endpoint | undefined;

  try {
    const applied = await migrate(db, await readMigrations(migrationsDir));

    endpoint =
      platform === "win32"
        ? namedPipeEndpoint(`nutria-${randomUUID()}`)
        : await unixSocketEndpoint(runtimeDir);
    const server = new PGLiteSocketServer({
      db,
      path: endpoint.listenPath,
      maxConnections: MAX_CONNECTIONS,
    });
    await server.start();

    const { host, remove } = endpoint;
    return {
      url: `postgresql://postgres:postgres@localhost/postgres?host=${encodeURIComponent(host)}`,
      applied,
      async stop() {
        await server.stop();
        await db.close();
        await remove();
      },
    };
  } catch (error) {
    await db.close();
    await endpoint?.remove();
    throw error;
  }
}
