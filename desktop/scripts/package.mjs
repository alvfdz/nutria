/**
 * Packages `desktop/dist` with electron-builder for the system it runs on,
 * versioned from the root `package.json` so the app and the release it
 * belongs to agree. Run `npm run build` first.
 *
 * - Linux: the unpacked app, `release/linux-unpacked`, which
 *   `scripts/flatpak.mjs` wraps in a Flatpak.
 * - Windows: an installer, `release/nutria-<version>-x64-setup.exe`.
 *
 * An app can only be packaged on the system it is for: Nutria's server holds
 * binaries compiled for the system `next build` ran on.
 */
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** electron-builder's flag for each system the app is packaged for. */
const PLATFORM_FLAGS = { linux: "--linux", win32: "--win" };

const desktop = fileURLToPath(new URL("..", import.meta.url));
const release = path.join(desktop, "release");
const { version } = JSON.parse(
  await readFile(path.join(desktop, "..", "package.json"), "utf8"),
);

const flag = PLATFORM_FLAGS[process.platform];
if (!flag) {
  console.error(`The desktop app isn't packaged for ${process.platform} yet.`);
  process.exit(1);
}

// Only what this script makes: the Flatpak's files in `release` stay.
for (const leftover of ["linux-unpacked", "win-unpacked"]) {
  await rm(path.join(release, leftover), { recursive: true, force: true });
}

// Run through Node rather than `node_modules/.bin`, whose launcher is a
// shell script on one system and a `.cmd` file on the other.
const cli = createRequire(import.meta.url).resolve("electron-builder/cli.js");
const { status } = spawnSync(
  process.execPath,
  [cli, flag, "--publish", "never", `-c.extraMetadata.version=${version}`],
  { cwd: desktop, stdio: "inherit" },
);
if (status !== 0) process.exit(status ?? 1);

console.log(
  `Packaged Nutria ${version} into ${path.relative(process.cwd(), release)}`,
);
