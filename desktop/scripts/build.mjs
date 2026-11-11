/**
 * Builds everything the desktop app runs, into `desktop/dist`:
 *
 * - `main.cjs` and `server.mjs`, the two processes, bundled from `src/`;
 * - `server/`, Nutria's standalone Next.js server with its static assets,
 *   laid out the way the container image lays it out;
 * - `migrations/`, a copy of `prisma/migrations`.
 *
 * `npm start` runs Electron straight from this folder, and `npm run package`
 * packages it. Pass `--skip-next` to reuse the last `next build`.
 */
import { spawnSync } from "node:child_process";
import { cp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const desktop = fileURLToPath(new URL("..", import.meta.url));
const root = path.join(desktop, "..");
const dist = path.join(desktop, "dist");
const standalone = path.join(root, ".next", "standalone");

/** Next.js copies the checkout's `.env*` files into its standalone output. */
const isEnvFile = (file) => path.basename(file).startsWith(".env");

/**
 * Lists every `.env*` file under a folder.
 *
 * @param {string} dir Folder to search.
 * @returns {Promise<string[]>} Their paths.
 */
async function findEnvFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => isEnvFile(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

if (!process.argv.includes("--skip-next")) {
  const { status } = spawnSync("npm", ["run", "build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (status !== 0) process.exit(status ?? 1);
}

await rm(dist, { recursive: true, force: true });

const shared = {
  bundle: true,
  platform: "node",
  target: "node22",
  logLevel: "warning",
  // Electron provides itself; PGlite loads its WebAssembly from its own
  // folder, so it ships in `node_modules` instead of inside the bundle.
  external: ["electron", "@electric-sql/*"],
};
await build({
  ...shared,
  entryPoints: [path.join(desktop, "src", "main.ts")],
  outfile: path.join(dist, "main.cjs"),
  format: "cjs",
});
await build({
  ...shared,
  entryPoints: [path.join(desktop, "src", "server.ts")],
  outfile: path.join(dist, "server.mjs"),
  format: "esm",
});

// The checkout's `.env` files hold local secrets: they must never ship.
// `verbatimSymlinks` keeps the standalone server's links relative (Next.js
// links its hashed package names to `node_modules`); Node would otherwise
// rewrite them to absolute paths that only exist on the build machine.
await cp(standalone, path.join(dist, "server"), {
  recursive: true,
  verbatimSymlinks: true,
  filter: (source) => !isEnvFile(source),
});
await cp(
  path.join(root, ".next", "static"),
  path.join(dist, "server", ".next", "static"),
  { recursive: true },
);
await cp(
  path.join(root, "prisma", "migrations"),
  path.join(dist, "migrations"),
  {
    recursive: true,
  },
);

const leaked = await findEnvFiles(dist);
if (leaked.length > 0) {
  console.error(
    `Refusing to build: .env files in the output:\n${leaked.join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `Built the desktop app into ${path.relative(process.cwd(), dist) || "."}`,
);
