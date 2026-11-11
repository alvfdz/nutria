/**
 * The desktop app's background process, started by the window process
 * (`main.ts`) as an Electron utility process. It does what the container's
 * start command and `scripts/serve.ts` do for a self-hosted instance: bring
 * the database up to date, then start Nutria's standalone server. Here the
 * database is embedded (`database.ts`) and the server only listens on this
 * machine.
 */
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  installClientIpHeader,
  parseTrustedProxies,
} from "../../src/lib/auth/client-ip.ts";
import { startDatabase, type EmbeddedDatabase } from "./database.ts";
import { ENV, type ServerMessage, type WindowMessage } from "./messages.ts";
import { MigrationError } from "./migrate.ts";
import { LOOPBACK } from "./settings.ts";

/** How long the server may take to answer its first request. */
const READY_TIMEOUT_MS = 60_000;

/**
 * Reads a variable the window process must have set.
 *
 * @param name The variable's name.
 * @returns Its value.
 * @throws {Error} If it is unset or empty.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

/**
 * Sends a message to the window process.
 *
 * @param message The message.
 */
function send(message: ServerMessage): void {
  process.parentPort.postMessage(message);
}

/**
 * Waits until the app answers on its port.
 *
 * @param origin The app's origin.
 * @throws {Error} If it has not answered within {@link READY_TIMEOUT_MS}.
 */
async function waitUntilServing(origin: string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/login`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("The app did not start in time.");
}

let database: EmbeddedDatabase | undefined;

process.parentPort.on("message", ({ data }: { data: WindowMessage }) => {
  if (data.type !== "shutdown") return;

  void (async () => {
    try {
      await database?.stop();
    } finally {
      process.exit(0);
    }
  })();
});

try {
  const port = required("PORT");
  required("BETTER_AUTH_SECRET");
  const origin = `http://${LOOPBACK}:${port}`;

  database = await startDatabase({
    dataDir: required(ENV.dataDir),
    migrationsDir: required(ENV.migrationsDir),
    // The session's runtime folder is private to the user and has a short
    // path; the temporary folder is the fallback where there is none.
    runtimeDir: process.env.XDG_RUNTIME_DIR || os.tmpdir(),
  });

  process.env.DATABASE_URL = database.url;
  process.env.BETTER_AUTH_URL = origin;
  process.env.HOSTNAME = LOOPBACK;

  // Stamps each request with the address of its connection, which sign-in
  // rate limiting keys by. No proxy sits in front of the desktop app.
  installClientIpHeader(parseTrustedProxies(undefined), http.Server.prototype);

  await import(
    pathToFileURL(path.join(required(ENV.serverDir), "server.js")).href
  );
  await waitUntilServing(origin);

  send({ type: "ready" });
} catch (error) {
  console.error(error);
  await database?.stop().catch(() => {});
  send({
    type: "error",
    message: (error as Error).message,
    code: error instanceof MigrationError ? error.code : undefined,
  });
}
