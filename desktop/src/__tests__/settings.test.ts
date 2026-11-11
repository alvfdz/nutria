import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:net";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadSettings,
  LOOPBACK,
  loopbackProbes,
  SETTINGS_FILE,
  type PortProbes,
} from "../settings.ts";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "nutria-settings-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true, maxRetries: 10 });
});

/** Probes with every port free, handing out `next` when asked for one. */
function probes(next = 4100, free = true): PortProbes {
  return {
    isPortFree: vi.fn(async () => free),
    findFreePort: vi.fn(async () => next),
  };
}

const stored = async () =>
  JSON.parse(await readFile(path.join(dir, SETTINGS_FILE), "utf8"));

describe("loadSettings", () => {
  it("creates a secret and picks a port on first launch", async () => {
    const settings = await loadSettings(dir, probes(4100));

    expect(settings.port).toBe(4100);
    expect(Buffer.from(settings.secret, "base64")).toHaveLength(32);
    expect(await stored()).toEqual(settings);
  });

  it("creates the data folder when it is missing", async () => {
    const nested = path.join(dir, "a", "b");

    await loadSettings(nested, probes());

    expect((await stat(path.join(nested, SETTINGS_FILE))).isFile()).toBe(true);
  });

  // Windows has no file modes: the data folder is in the user's own profile.
  it.skipIf(process.platform === "win32")(
    "keeps the file readable by its owner only",
    async () => {
      await loadSettings(dir, probes());

      const { mode } = await stat(path.join(dir, SETTINGS_FILE));
      expect(mode & 0o777).toBe(0o600);
    },
  );

  it("returns the same secret and port on later launches", async () => {
    const first = await loadSettings(dir, probes(4100));
    const later = probes(4200);

    expect(await loadSettings(dir, later)).toEqual(first);
    expect(later.findFreePort).not.toHaveBeenCalled();
  });

  it("does not rewrite the file when nothing changed", async () => {
    await loadSettings(dir, probes());
    const before = await stat(path.join(dir, SETTINGS_FILE));

    await loadSettings(dir, probes());

    const after = await stat(path.join(dir, SETTINGS_FILE));
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(after.ino).toBe(before.ino);
  });

  it("moves to a new port when the stored one is taken, keeping the secret", async () => {
    const first = await loadSettings(dir, probes(4100));

    const second = await loadSettings(dir, probes(4200, false));

    expect(second).toEqual({ secret: first.secret, port: 4200 });
    expect(await stored()).toEqual(second);
  });

  it.each([
    ["is not JSON", "{ nope"],
    ["is not an object", "null"],
    ["has a short secret and a bad port", '{"secret":"abc","port":"80"}'],
    ["has an out-of-range port", `{"secret":"${"x".repeat(44)}","port":70000}`],
  ])("replaces what it can't use when the file %s", async (_case, content) => {
    await writeFile(path.join(dir, SETTINGS_FILE), content);

    const settings = await loadSettings(dir, probes(4100));

    expect(settings.port).toBe(4100);
    expect(settings.secret.length).toBeGreaterThanOrEqual(32);
    expect(await stored()).toEqual(settings);
  });

  it("keeps a valid secret when only the port is unusable", async () => {
    const secret = "s".repeat(44);
    await writeFile(
      path.join(dir, SETTINGS_FILE),
      JSON.stringify({ secret, port: 1.5 }),
    );

    expect(await loadSettings(dir, probes(4100))).toEqual({
      secret,
      port: 4100,
    });
  });
});

describe("loopbackProbes", () => {
  let holder: Server | undefined;

  afterEach(async () => {
    await new Promise((resolve) =>
      holder ? holder.close(resolve) : resolve(undefined),
    );
    holder = undefined;
  });

  it("finds a port that is then free to listen on", async () => {
    const port = await loopbackProbes.findFreePort();

    expect(port).toBeGreaterThan(0);
    expect(await loopbackProbes.isPortFree(port)).toBe(true);
  });

  it("reports a port another program holds as taken", async () => {
    const server = createServer();
    holder = server;
    const port = await new Promise<number>((resolve) => {
      server.listen(0, LOOPBACK, () => {
        resolve((server.address() as { port: number }).port);
      });
    });

    expect(await loopbackProbes.isPortFree(port)).toBe(false);
  });
});
