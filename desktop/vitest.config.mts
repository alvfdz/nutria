import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    // PGlite starts a whole PostgreSQL in WebAssembly for each test.
    testTimeout: 30_000,
  },
});
