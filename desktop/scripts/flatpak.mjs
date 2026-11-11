/**
 * Builds the Flatpak from `desktop/release/linux-unpacked` (run
 * `npm run package` first) into one installable file,
 * `desktop/release/nutria-<version>-<arch>.flatpak`.
 *
 * Uses `flatpak-builder` when it is installed, and the `org.flatpak.Builder`
 * Flatpak otherwise. The runtime, SDK and Electron base app the manifest
 * names are installed from Flathub, for the current user, when missing.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ID = "io.github.alvfdz.Nutria";
const FLATHUB = "https://dl.flathub.org/repo/flathub.flatpakrepo";
/** The manifest's `default-branch`. */
const BRANCH = "stable";

const desktop = fileURLToPath(new URL("..", import.meta.url));
const release = path.join(desktop, "release");
const { version } = JSON.parse(
  await readFile(path.join(desktop, "..", "package.json"), "utf8"),
);

/**
 * Runs a command, ending the script when it fails.
 *
 * @param {string} command Program to run.
 * @param {string[]} args Its arguments.
 */
function run(command, args) {
  const { status, error } = spawnSync(command, args, {
    cwd: desktop,
    stdio: "inherit",
  });
  if (error) {
    console.error(`Could not run ${command}: ${error.message}`);
    process.exit(1);
  }
  if (status !== 0) process.exit(status ?? 1);
}

/**
 * Tells whether a command exits successfully, without showing its output.
 *
 * @param {string} command Program to run.
 * @param {string[]} args Its arguments.
 * @returns {boolean} `true` when it ran and exited with 0.
 */
function works(command, args) {
  return spawnSync(command, args, { stdio: "ignore" }).status === 0;
}

if (!existsSync(path.join(release, "linux-unpacked", "nutria"))) {
  console.error("Nothing to bundle: run `npm run package` first.");
  process.exit(1);
}
if (!works("flatpak", ["--version"])) {
  console.error("Flatpak is not installed: see https://flatpak.org/setup/");
  process.exit(1);
}

const builder = works("flatpak-builder", ["--version"])
  ? ["flatpak-builder"]
  : works("flatpak", ["info", "org.flatpak.Builder"])
    ? ["flatpak", "run", "org.flatpak.Builder"]
    : null;
if (!builder) {
  console.error(
    "flatpak-builder is not installed. Install it from your distribution, or run:\n" +
      "  flatpak install --user flathub org.flatpak.Builder",
  );
  process.exit(1);
}

// Software centers show the newest release's version and date.
const metainfo = await readFile(
  path.join(desktop, "flatpak", `${APP_ID}.metainfo.xml.in`),
  "utf8",
);
await writeFile(
  path.join(release, `${APP_ID}.metainfo.xml`),
  metainfo
    .replaceAll("@VERSION@", version)
    .replaceAll("@DATE@", new Date().toISOString().slice(0, 10)),
);

// A fresh repository each time, so the bundle can only hold this build.
const repo = path.join(release, "flatpak-repo");
await rm(repo, { recursive: true, force: true });

const [command, ...prefix] = builder;
run(command, [
  ...prefix,
  "--force-clean",
  "--user",
  "--install-deps-from=flathub",
  `--state-dir=${path.join(release, ".flatpak-builder")}`,
  `--repo=${repo}`,
  path.join(release, "flatpak-build"),
  path.join(desktop, "flatpak", `${APP_ID}.yml`),
]);

const arch = spawnSync("flatpak", ["--default-arch"], {
  encoding: "utf8",
}).stdout.trim();
const bundle = path.join(release, `nutria-${version}-${arch}.flatpak`);
run("flatpak", [
  "build-bundle",
  // Lets the installer fetch the runtime on a system without Flathub set up.
  `--runtime-repo=${FLATHUB}`,
  repo,
  bundle,
  APP_ID,
  BRANCH,
]);

console.log(`Built ${path.relative(process.cwd(), bundle)}`);
