# Nutria

An open-source nutrition helper: a macro/calorie tracker paired with a
forward-looking meal planner. See [`docs/vision.md`](docs/vision.md) for the
product direction.

Built with Next.js (App Router), TypeScript, Tailwind CSS and shadcn/ui on the
front, PostgreSQL via Prisma on the back. The database runs from a
Docker Compose–compatible `compose.yaml`, so it works with either Podman or
Docker.

## Prerequisites

- Node.js 22.18 or newer (developed on 24.x)
- Either [Podman](https://podman.io/) or Docker, plus a Compose provider (below)

## Setup

### 1. Install a Compose provider

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

Every command below is written twice. Use whichever pair matches your engine:

| Podman                        | Docker                        |
| ----------------------------- | ----------------------------- |
| `podman compose up -d --wait` | `docker compose up -d --wait` |
| `podman compose down`         | `docker compose down`         |
| `podman compose down -v`      | `docker compose down -v`      |

### 2. Start PostgreSQL

```bash
podman compose up -d --wait   # or: docker compose up -d --wait
```

`--wait` blocks until the container's healthcheck reports ready, so the next
step cannot race the database. The data lives in the `nutria-postgres` named
volume and survives restarts; add `-v` to `down` to throw it away.

The defaults (`nutria` / `nutria` / `nutria` on port 5432) need no
configuration. To override them, uncomment the `POSTGRES_*` lines in
`.env.local` — `compose.yaml` reads the same file through its `${VAR:-default}`
fallbacks.

### 3. Configure the app and create the schema

```bash
cp .env.example .env.local
npm run db:migrate -- --name init
```

The Prisma CLI loads `.env*` through `@next/env`, so `.env.local` is the single
source of truth for `DATABASE_URL` and no `.env` copy is needed.

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A fresh install sends you
to `/setup` to create the owner account; see [Authentication](#authentication).

## Authentication

Nutria is single-tenant: one account owns the instance, and every page, server
action and API route requires it to be signed in. Authentication is handled by
[Better Auth](https://www.better-auth.com/) with email and password, sessions
stored in PostgreSQL and passwords hashed with scrypt.

- **First run.** While the database has no account, every page redirects to
  `/setup`, where you create the owner account. Sign-up closes as soon as it
  exists: both the setup screen and Better Auth's sign-up endpoint refuse a
  second account, and a database trigger (`users_single_owner`) enforces the
  same rule against sign-ups racing each other.
- **Configuration.** Set `BETTER_AUTH_SECRET` (signs the session cookies; keep
  it stable) and `BETTER_AUTH_URL` (the public origin you open Nutria at) in
  `.env.local`, as shown in `.env.example`.
- **Rate limiting.** In production Better Auth allows 3 sign-in attempts per 10
  seconds per client. Behind a reverse proxy, make sure it forwards the client
  address in `X-Forwarded-For`; otherwise all clients share one bucket.
- **Changing the password.** Signed in, open **Account** in the header. The
  current password is required, and other devices are signed out on success.
- **Locked out?** Nutria sends no email, so there is no "forgot password"
  link. Anyone with shell access to the deployment can reset the password
  instead, from a full checkout of the repository (including `scripts/` and `src/`) that
  can reach the database, e.g. the app container if it ships the source:

  ```bash
  npm run auth:reset-password            # the only account
  npm run auth:reset-password -- owner@example.com
  ```

  It prompts for the new password without echoing it (or reads
  `NUTRIA_NEW_PASSWORD` for scripted use) and signs the account out
  everywhere.

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

Open source — see [`docs/vision.md`](docs/vision.md) for scope and intent.
