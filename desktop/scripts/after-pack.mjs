/**
 * electron-builder's `afterPack` hook: runs once the app's folder is laid
 * out, and before any installer is made from it.
 *
 * It adds Nutria's standalone server and its migrations next to the app, as
 * plain folders, where `main.ts` looks for them once packaged.
 * electron-builder can't do it itself: it leaves `node_modules` and
 * dot-folders out of `extraResources`, and the server needs both.
 *
 * It then refuses to go on if the app holds anything that only works on the
 * machine that built it.
 */
import { cp, readdir, readlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * Finds the files that must never ship: `.env` files, which hold the
 * checkout's secrets, and links that lead outside the app, which point into
 * the checkout and break everywhere else.
 *
 * @param {string} appDir The packaged app's folder.
 * @returns {Promise<string[]>} One line per problem; empty when there is none.
 */
export async function findProblems(appDir) {
  const entries = await readdir(appDir, {
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
        path.relative(appDir, resolved).startsWith("..")
      ) {
        problems.push(`${file}: links outside the app, to ${target}`);
      }
    }
  }

  return problems;
}

/**
 * @param {import("electron-builder").AfterPackContext} context What was packed.
 * @throws {Error} If the app holds an `.env` file or a link leading outside it.
 */
export default async function afterPack({ appOutDir, packager }) {
  const resources = packager.getResourcesDir(appOutDir);

  for (const folder of ["server", "migrations"]) {
    await cp(path.join(dist, folder), path.join(resources, folder), {
      recursive: true,
      verbatimSymlinks: true,
    });
  }

  const problems = await findProblems(appOutDir);
  if (problems.length > 0) {
    throw new Error(`Refusing to package:\n${problems.join("\n")}`);
  }
}
