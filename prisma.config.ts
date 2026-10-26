import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// The Prisma CLI runs outside the Next.js runtime, so it loads the very same
// `.env*` files `next dev` does: on a checkout `DATABASE_URL` comes from
// `.env.development`. The container image sets `NODE_ENV=production` and ships
// no `.env*` files, so there the URL comes from the environment compose sets.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // `process.env` rather than Prisma's `env()` helper on purpose: `env()`
  // throws while the config is being loaded, which would break `prisma
  // generate` where no URL is set, such as the image build. The migrate
  // commands still fail loudly on the empty URL.
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
