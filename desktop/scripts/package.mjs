/**
 * Packages `desktop/dist` into `desktop/release/linux-unpacked` with
 * electron-builder, versioned from the root `package.json` so the app and
 * the release it belongs to agree. Run `npm run build` first.
 */
import { spawnSync } from "node:child_process";
import { cp, readFile, readdir, readlink, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktop = fileURLToPath(new URL("..", import.meta.url));
const { version } = JSON.parse(
  await readFile(path.join(desktop, "..", "package.json"), "utf8"),
);
const unpacked = path.join(desktop, "release", "linux-unpacked");

await rm(unpacked, { recursive: true, force: true });

const { status } = spawnSync(
  path.join(desktop, "node_modules", ".bin", "electron-builder"),
  [
    "--linux",
    "dir",
    "--publish",
    "never",
    `-c.extraMetadata.version=${version}`,
  ],
  { cwd: desktop, stdio: "inherit" },
);
if (status !== 0) process.exit(status ?? 1);

// Nutria's standalone server and its migrations go in as plain folders, where
// `main.ts` looks for them once packaged.
for (const folder of ["server", "migrations"]) {
  await cp(
    path.join(desktop, "dist", folder),
    path.join(unpacked, "resources", folder),
    { recursive: true, verbatimSymlinks: true },
  );
}

// Last line of defense: `build.mjs` already keeps `.env` files out, and
// links relative. An absolute link would point into this checkout, and work
// here while breaking on every other machine.
const entries = await readdir(unpacked, {
  withFileTypes: true,
  recursive: true,
});
const problems = [];
for (const entry of entries) {
  const file = path.join(entry.parentPath, entry.name);
  if (entry.name.startsWith(".env")) {
    problems.push(`${file}: an .env file`);
  } else if (entry.isSymbolicLink()) {
    const target = await readlink(file);
    const resolved = path.resolve(entry.parentPath, target);
    if (
      path.isAbsolute(target) ||
      path.relative(unpacked, resolved).startsWith("..")
    ) {
      problems.push(`${file}: links outside the app, to ${target}`);
    }
  }
}
if (problems.length > 0) {
  console.error(`Refusing to package:\n${problems.join("\n")}`);
  process.exit(1);
}

console.log(
  `Packaged Nutria ${version} into ${path.relative(process.cwd(), unpacked)}`,
);
