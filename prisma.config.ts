import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// The Prisma CLI runs outside the Next.js runtime, so it loads the very same
// `.env*` files Next does. `.env` therefore stays the single source of
// truth for `DATABASE_URL`; the CLI needs no separate copy.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // `process.env` rather than Prisma's `env()` helper on purpose: `env()`
  // throws while the config is being loaded, which would break `prisma
  // generate` on a machine that has no `.env` yet. The migrate commands
  // still fail loudly on the empty URL.
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
