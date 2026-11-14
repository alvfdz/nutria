import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";

/** Name of the settings file inside the app's data folder. */
export const SETTINGS_FILE = "settings.json";

/** Address the app's own server listens on: this machine only. */
export const LOOPBACK = "127.0.0.1";

/** What the desktop app remembers between launches. */
export interface DesktopSettings {
  /** Signs the session cookies (`BETTER_AUTH_SECRET`). Never changes. */
  secret: string;
  /**
   * Port the app's server listens on. Kept between launches because the
   * browser side stores the theme per origin, and the port is part of it.
   */
  port: number;
}

/** The network probes {@link loadSettings} uses, injectable for tests. */
export interface PortProbes {
  /**
   * Tells whether a loopback port can be listened on right now.
   *
   * @param port The port to try.
   * @returns `true` when nothing else holds it.
   */
  isPortFree(port: number): Promise<boolean>;
  /**
   * Asks the system for a loopback port nothing is using.
   *
   * @returns The port.
   */
  findFreePort(): Promise<number>;
}

/**
 * Listens on a loopback port for an instant.
 *
 * @param port The port to try; `0` lets the system choose one.
 * @returns The port that was bound, or `null` when it could not be.
 */
function tryListen(port: number): Promise<number | null> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(null));
    server.listen(port, LOOPBACK, () => {
      const address = server.address();
      const bound =
        typeof address === "object" && address ? address.port : null;
      server.close(() => resolve(bound));
    });
  });
}

/** The real probes, on the loopback interface. */
export const loopbackProbes: PortProbes = {
  async isPortFree(port) {
    return (await tryListen(port)) !== null;
  },
  async findFreePort() {
    const port = await tryListen(0);
    if (port === null) {
      throw new Error("No free port is available on this computer.");
    }
    return port;
  },
};

/**
 * Reads the stored settings, tolerating a missing or damaged file.
 *
 * @param file Path of the settings file.
 * @returns The fields that were stored and valid.
 */
async function readStored(file: string): Promise<Partial<DesktopSettings>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null) return {};

  const { secret, port } = parsed as Record<string, unknown>;
  return {
    secret:
      typeof secret === "string" && secret.length >= 32 ? secret : undefined,
    port:
      typeof port === "number" &&
      Number.isInteger(port) &&
      port > 0 &&
      port < 65536
        ? port
        : undefined,
  };
}

/**
 * Loads the desktop app's settings from its data folder, creating whatever
 * is missing: the cookie-signing secret on first launch, and a port when
 * there is none yet or another program has taken the stored one.
 *
 * The file is written through a temporary one and readable by its owner
 * only, since the secret is what keeps sessions from being forged.
 *
 * @param dataDir The app's data folder; created when missing.
 * @param probes Port probes; the loopback ones unless a test injects others.
 * @returns The settings to start the server with.
 * @throws {Error} If the folder cannot be written, or no port is free.
 */
export async function loadSettings(
  dataDir: string,
  probes: PortProbes = loopbackProbes,
): Promise<DesktopSettings> {
  await mkdir(dataDir, { recursive: true });

  const file = path.join(dataDir, SETTINGS_FILE);
  const stored = await readStored(file);

  const secret = stored.secret ?? randomBytes(32).toString("base64");
  const port =
    stored.port !== undefined && (await probes.isPortFree(stored.port))
      ? stored.port
      : await probes.findFreePort();

  if (secret !== stored.secret || port !== stored.port) {
    const temporary = `${file}.tmp`;
    await writeFile(
      temporary,
      `${JSON.stringify({ secret, port }, null, 2)}\n`,
      {
        mode: 0o600,
      },
    );
    await rename(temporary, file);
  }

  return { secret, port };
}
