/** What the server process tells the window process. */
export type ServerMessage =
  /** The app answers on its port; the window can load it. */
  | { type: "ready" }
  /** Startup failed. `code` is a `MigrationErrorCode` when it has one. */
  | { type: "error"; message: string; code?: string };

/** What the window process tells the server process. */
export type WindowMessage =
  /** Close the database cleanly and exit. */
  { type: "shutdown" };

/** Environment variables the window process starts the server process with. */
export const ENV = {
  /** The app's data folder. */
  dataDir: "NUTRIA_DATA_DIR",
  /** The folder holding the Next.js standalone `server.js`. */
  serverDir: "NUTRIA_SERVER_DIR",
  /** The `prisma/migrations` folder. */
  migrationsDir: "NUTRIA_MIGRATIONS_DIR",
} as const;
