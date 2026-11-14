/**
 * Packages `desktop/dist` with electron-builder for the system it runs on,
 * versioned from the root `package.json` so the app and the release it
 * belongs to agree. Run `npm run build` first.
 *
 * - Linux: the unpacked app, `release/linux-unpacked`, which
 *   `scripts/flatpak.mjs` wraps in a Flatpak.
 * - Windows: an installer, `release/nutria-<version>-x64-setup.exe`.
 * - macOS: a disk image, `release/nutria-<version>-<arch>.dmg`, for the
 *   processor it is built on (`arm64` or `x64`). The app in it carries an
 *   ad-hoc signature, which this script checks.
 *
 * An app can only be packaged on the system it is for: Nutria's server holds
 * binaries compiled for the system `next build` ran on.
 */
import { spawnSync } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** electron-builder's flag for each system the app is packaged for. */
const PLATFORM_FLAGS = { linux: "--linux", win32: "--win", darwin: "--mac" };

const desktop = fileURLToPath(new URL("..", import.meta.url));
const release = path.join(desktop, "release");
const { version } = JSON.parse(
  await readFile(path.join(desktop, "..", "package.json"), "utf8"),
);

/**
 * Checks the packaged macOS app is signed, and that nothing in it changed
 * since. A Mac with an Apple processor refuses an app that fails this, as
 * "damaged", so a build that lost its signature must not be released. Exits
 * the script when the check fails.
 *
 * @returns Once the app passed.
 */
async function checkSignature() {
  // `mac` on Intel processors, `mac-arm64` on Apple ones.
  const folder = (await readdir(release)).find((name) =>
    /^mac(-|$)/.test(name),
  );
  if (!folder) {
    console.error("No packaged macOS app to check the signature of.");
    process.exit(1);
  }

  const app = path.join(release, folder, "Nutria.app");
  const { status } = spawnSync(
    "codesign",
    ["--verify", "--deep", "--strict", "--verbose=2", app],
    { stdio: "inherit" },
  );
  if (status !== 0) {
    console.error(`${app} has no valid signature.`);
    process.exit(status ?? 1);
  }
}

const flag = PLATFORM_FLAGS[process.platform];
if (!flag) {
  console.error(`The desktop app isn't packaged for ${process.platform} yet.`);
  process.exit(1);
}

// Only what this script makes: the Flatpak's files in `release` stay.
for (const leftover of ["linux-unpacked", "win-unpacked", "mac", "mac-arm64"]) {
  await rm(path.join(release, leftover), { recursive: true, force: true });
}

// Run through Node rather than `node_modules/.bin`, whose launcher is a
// shell script on some systems and a `.cmd` file on Windows.
const cli = createRequire(import.meta.url).resolve("electron-builder/cli.js");
const { status } = spawnSync(
  process.execPath,
  [cli, flag, "--publish", "never", `-c.extraMetadata.version=${version}`],
  {
    cwd: desktop,
    stdio: "inherit",
    // electron-builder skips signing in a pull request's build, to keep a
    // certificate away from it. The ad-hoc signature uses none.
    env: { ...process.env, CSC_FOR_PULL_REQUEST: "true" },
  },
);
if (status !== 0) process.exit(status ?? 1);

if (process.platform === "darwin") await checkSignature();

console.log(
  `Packaged Nutria ${version} into ${path.relative(process.cwd(), release)}`,
);
