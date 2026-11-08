import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Reads the `paths` entries in tsconfig.json (`@/*` and `@test/*`).
  resolve: {
    tsconfigPaths: true,
    alias: {
      // The real module throws on import outside a React Server Component
      // graph; the tests import the same modules through the client entry.
      "server-only": resolve("./test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    // Each file still runs in its own isolated context, but a worker builds
    // jsdom once instead of once per file: about 30% off the suite's time.
    pool: "vmThreads",
    setupFiles: [resolve("./test/setup.ts")],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // The defaults plus `json-summary`, whose totals CI writes to the job
      // summary.
      reporter: ["text", "html", "clover", "json", "json-summary"],
      include: ["src/**"],
      // The vendored shadcn primitives are excluded so the number reflects
      // the code we actually own.
      exclude: [
        "**/__tests__/**",
        "**/*.test.*",
        "src/components/ui/**",
        // Written by the Prisma generator, not by us.
        "src/generated/**",
      ],
      // The floor `npm run test:coverage`, and so CI, fails below. It sits
      // just under the current numbers: raise it as coverage grows, and
      // don't lower it to get a change through.
      thresholds: {
        statements: 99,
        branches: 99,
        functions: 99,
        lines: 99,
      },
    },
  },
});
