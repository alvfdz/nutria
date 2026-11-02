# Nutria

An open-source nutrition helper: a macro/calorie tracker paired with a
forward-looking meal planner. See [`docs/vision.md`](docs/vision.md) for the
product direction.

Built with Next.js (App Router), TypeScript, Tailwind CSS and shadcn/ui on the
front, PostgreSQL via Prisma on the back. Both run from Docker
Compose–compatible files (`compose.dev.yaml` for development, `compose.yaml`
for self-hosting), so they work with either Podman or Docker.

## Prerequisites

- Node.js 22.18 or newer (developed on 24.x)
- Either [Podman](https://podman.io/) or Docker, plus a Compose provider (below)

## Install a Compose provider

Both development and self-hosting need one.

**Podman** needs Compose available as a CLI plugin. Pick whichever option suits
your machine — the binary is the same either way:

```bash
# Podman with the Compose v2 plugin (needs `curl` and `jq`)
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v5.5.0/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
podman compose version
```

Podman also looks in `/usr/local/lib/docker/cli-plugins/` and
`/usr/local/libexec/docker/cli-plugins/` if you prefer a system-wide install, and
[`podman-compose`](https://github.com/containers/podman-compose) works as a
fallback if you would rather not install the binary.

**Docker** ships Compose v2 as `docker compose` out of the box, so there is
nothing to install.

The commands below use Podman; with Docker, replace `podman compose` with
`docker compose`.

Development and self-hosting are configured separately:

|               | Development                     | Self-hosting                   |
| ------------- | ------------------------------- | ------------------------------ |
| Compose file  | `compose.dev.yaml` (database)   | `compose.yaml` (app, database) |
| Configuration | `.env.development` (committed)  | `.env` (from `.env.example`)   |
| Read by       | Next.js, Prisma CLI, `scripts/` | Compose                        |
| Overrides     | `.env.development.local`        | none                           |
| To edit       | nothing                         | password, secret, origin       |

## Development

### 1. Start PostgreSQL and create the schema

```bash
podman compose -f compose.dev.yaml up -d --wait
npm run db:migrate -- --name init
```

`--wait` blocks until the healthcheck reports ready, so the migration cannot
race the database. The data lives in the `nutria-dev-postgres` volume and
survives restarts; `podman compose -f compose.dev.yaml down -v` throws it away.

No configuration is needed: `next dev`, the Prisma CLI and `scripts/` load the
committed `.env.development`, which holds the development database URL and a
public development secret. They also load a `.env`, if one exists, but with
the lowest priority: every value `.env.development` sets wins over it. To
change a development value, put it in `.env.development.local` (gitignored),
which wins over both. A `.env.local`, if one exists, also wins over
`.env.development`, and it applies to production builds too.

### 2. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A fresh install sends you
to `/setup` to create the owner account; see [Authentication](#authentication).

`.env.development` applies to `next dev` only. `npm run build` and `npm start`
run in production mode and skip it, so a production build run outside the
container needs `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
from the environment or a gitignored `.env.production.local`.

## Self-hosting

With a [Compose provider](#install-a-compose-provider) installed:

```bash
cp .env.example .env     # then set the values below
podman compose up -d --build --wait
```

Compose reads `.env` to configure the containers. It needs three values:

- `POSTGRES_PASSWORD`: the database password (`openssl rand -hex 24`). It is
  set when the volume is first created; changing it later does not change it
  in an existing database. It goes into a connection URL unescaped, so avoid
  `@ / : #`.
- `BETTER_AUTH_SECRET`: signs the session cookies (`openssl rand -base64 32`).
  Keep it stable, or every session is invalidated.
- `BETTER_AUTH_URL`: the public origin users open Nutria at, e.g.
  `https://nutria.example.com` behind a reverse proxy.

Compose refuses to start while the password or the secret is empty. `APP_PORT`
changes the host port (default 3000); `POSTGRES_USER` and `POSTGRES_DB` are
optional. `TZ` sets your time zone (e.g. `Europe/Madrid`, default UTC), which
decides when "today" starts on the Today page and the calendar.

The `app` container applies pending Prisma migrations every time it starts,
then serves Nutria. It reaches the database at `postgres:5432` inside the
compose network, and the database publishes no port, so nothing outside that
network can reach it. Build the image alone with `podman build -t nutria .`.

## Authentication

Nutria is single-tenant: one account owns the instance, and every page, server
action and API route requires it to be signed in. Authentication is handled by
[Better Auth](https://www.better-auth.com/) with email and password, sessions
stored in PostgreSQL and passwords hashed with scrypt.

- **First run.** While the database has no account, every page redirects to
  `/setup`, where you create the owner account. Sign-up closes as soon as it
  exists: both the setup screen and Better Auth's sign-up endpoint refuse a
  second account, and a database trigger (`users_single_owner`) enforces the
  same rule against sign-ups racing each other. A short tutorial then opens on
  the Today page; replay it any time from the Account page.
- **Configuration.** `BETTER_AUTH_SECRET` signs the session cookies (keep it
  stable) and `BETTER_AUTH_URL` is the public origin you open Nutria at.
  Development takes both from `.env.development`, self-hosting from `.env`.
- **Rate limiting.** In production Better Auth allows 3 sign-in attempts per 10
  seconds per client. Behind a reverse proxy, make sure it forwards the client
  address in `X-Forwarded-For`; otherwise all clients share one bucket.
- **Changing the password.** Signed in, open **Account** in the header. The
  current password is required, and other devices are signed out on success.
- **Locked out?** Nutria sends no email, so there is no "forgot password"
  link. Anyone with shell access to the deployment can reset the password
  instead. When self-hosting, run the command the image ships, next to
  `compose.yaml`:

  ```bash
  podman compose exec app reset-password            # the only account
  podman compose exec app reset-password owner@example.com
  ```

  In development, run it from the checkout; it targets the database in
  `.env.development` unless `DATABASE_URL` is set:

  ```bash
  npm run auth:reset-password            # the only account
  npm run auth:reset-password -- owner@example.com
  ```

  It prompts for the new password without echoing it (or reads
  `NUTRIA_NEW_PASSWORD` for scripted use, e.g.
  `podman compose exec -e NUTRIA_NEW_PASSWORD="$PASSWORD" app reset-password`)
  and signs the account out everywhere.

- **Multi-user ready.** Every ingredient, meal, goals row and plan carries the
  `userId` that owns it, and every query is scoped by it, so opening sign-up
  to more accounts later needs no data migration.

Upgrading a development database from before authentication existed: the
migration adds required `userId` columns, so reset it with `npm run db:reset`.

## Database commands

| Command                            | What it does                                              |
| ---------------------------------- | --------------------------------------------------------- |
| `npm run db:generate`              | Regenerates the Prisma client into `src/generated`        |
| `npm run db:migrate -- --name <x>` | Creates and applies a migration during development        |
| `npm run db:deploy`                | Applies pending migrations without prompting (production) |
| `npm run db:reset`                 | Drops the schema, replays every migration, re-seeds       |
| `npm run db:studio`                | Opens Prisma Studio at localhost:5555                     |

`prisma generate` runs automatically on `npm install`. On an existing checkout
where it has not run yet, run `npm run db:generate` before `npm run typecheck`
or `npm run build` — both need the generated client to exist.

## Scripts

| Command             | What it does               |
| ------------------- | -------------------------- |
| `npm run dev`       | Starts the dev server      |
| `npm run build`     | Production build           |
| `npm test`          | Runs the vitest suite      |
| `npm run typecheck` | `tsc --noEmit`             |
| `npm run lint`      | ESLint                     |
| `npm run format`    | Prettier, writing in place |

## Testing

The suite mocks the Prisma client, so it needs neither a database nor a running
container:

```bash
npm test
```

## Macro math

Gram targets for protein, carbs and fat derive from the daily calorie target
and the percentage split using the 4/4/9 food-energy rule: protein and carbs
yield ~4 kcal/g, fat ~9 kcal/g.

```
grams = calories × (pct / 100) / kcalPerGram
```

For 2000 kcal at 30% protein / 40% carbs / 30% fat:

- Protein: `2000 × 0.30 / 4` = **150 g**
- Carbs: `2000 × 0.40 / 4` = **200 g**
- Fat: `2000 × 0.30 / 9` = **66.7 g**

A meal slot's budget is the daily numbers scaled by the slot's share of the
day — a 40% lunch gets 800 kcal, 60 g protein, 80 g carbs and 26.7 g fat.

The math lives in `src/lib/goals/budget.ts` (`computeMacroBudget` and
`computeSlotBudgets`) and is shared by the server action and the form's live
summary. Rounded values appear only at display time; the stored data and the
calculations keep full precision.

## Dependency overrides

`package.json` pins two transitive dependencies ahead of what the Prisma CLI
asks for:

```json
"overrides": {
  "deepmerge-ts": "8.0.2",
  "mysql2": "3.24.5"
}
```

Both come from `prisma@7.10.0`, which pins them to exact versions carrying
published advisories — `deepmerge-ts@7.1.5` (stack exhaustion on recursive
object graphs, GHSA-ggr8-5vv4-36mx) and `mysql2@3.15.3` (credential leak and
decompression-bomb DoS, GHSA-3f6p-5ww8-9rcr / GHSA-rgwj-5xj2-c3m3). Neither is
reachable from application code: `deepmerge-ts` is used by `@prisma/config`
while loading `prisma.config.ts`, and `mysql2` only speaks the MySQL wire
protocol, which this project never uses. `npm audit` flags them anyway because
`prisma` is a peer dependency of `@prisma/client` and therefore part of the
resolved tree.

Without the overrides the only fix npm offers is downgrading to `prisma@6`.

### `deepmerge-ts`

The 7 → 8 bump is a major version, so it deserves justification beyond "the
scan went away". Three facts make it the right call:

**Upstream has already asked for this bump.**
[prisma/prisma#30052](https://github.com/prisma/prisma/issues/30052) (open since
2026-08-17) requests exactly this change and lists a consumer-side override as
the mitigation while it is pending. The reporter also classifies the finding as
dependency hygiene rather than an exploit: the advisory's trigger is a crafted
self-referencing object graph, and in Prisma the only call site merges the
developer's own `prisma.config.ts`, which `c12` already executes via `jiti`
before merging. Reaching it would require the ability to run code on the
machine already.

**Prisma's own dev line already ships it.**
`@prisma/config@8.1.0-dev.7` depends on `deepmerge-ts@8.0.2` — the exact version
pinned here. Only the stable `7.10.0` release still asks for `7.1.5`, so this
override converges on what upstream will require anyway rather than diverging
from it.

**The breaking changes do not reach the call site.**
8.0.0 changes Map merging to recursive, stops `deepmergeInto` leak-mutating its
inputs, and renames two types. `@prisma/config` imports only the plain
`deepmerge` export and passes it as `c12`'s `merger` with `extend`, `giget`,
`rcFile`, `packageJson` and `dotenv` all disabled — so it merges the local
config against nothing, touches no Maps, and never reaches `deepmergeInto` or
the renamed types.

Two caveats worth knowing:

- The fix is still only in Prisma's dev channel. Dropping the override requires
  a stable release that pins `>=8.0.0`.
- Moving to Prisma 8 is a separate, larger migration (its config API changes
  shape to a `definePrismaConfig` envelope), so it is not a shortcut to
  unpinning this dependency.

Re-verify after bumping Prisma:

```bash
npm run db:generate && npm run db:deploy && npm test
```

### `mysql2`

A same-major bump, and doubly inert: the CLI reaches it through a dynamic
`await import("mysql2/promise")` inside the `mysql:` adapter factory, so it is
never evaluated on a Postgres project.

## License

Nutria's code is released under the [MIT License](LICENSE). It is provided "as
is", with no warranty and no support of any kind.

Third-party code copied into this repository keeps its own license: see
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

### Food data

The MIT License does not cover food data. Food search results come from
[Open Food Facts](https://world.openfoodfacts.org) contributors. The database is
available under the Open Database License, its individual contents under the
Database Contents License, and product images under Creative Commons
Attribution-ShareAlike. See their
[terms of use](https://world.openfoodfacts.org/terms-of-use).

This data may contain errors and must not be used for medical purposes. Nutria
is not medical advice.
