# Nutria

An open-source nutrition helper: a macro/calorie tracker paired with a
forward-looking meal planner. See [`docs/vision.md`](docs/vision.md) for the
product direction.

Built with Next.js (App Router), TypeScript, Tailwind CSS and shadcn/ui on the
front, PostgreSQL via Prisma on the back. Both run from Docker
Compose–compatible files (`compose.dev.yaml` for development, `compose.yaml`
for self-hosting), so they work with either Podman or Docker.

## Prerequisites

- Node.js 22.18 or newer (developed on 24.x; `.nvmrc` selects it for nvm, fnm and similar tools)
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
npm run db:deploy
```

`--wait` blocks until the healthcheck reports ready, so the migrations cannot
race the database. `db:deploy` applies the committed migrations as they are;
`npm run db:migrate -- --name <x>` is for when you change the schema (see
[Database commands](#database-commands)). The data lives in the `nutria-dev-postgres` volume and
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
optional. `TRUSTED_PROXIES` matters only behind a reverse proxy; see
[below](#behind-a-reverse-proxy). `TZ` sets your time zone (e.g. `Europe/Madrid`, default UTC), which
decides when "today" starts on the Today page and the calendar.

### Behind a reverse proxy

Sign-in is rate-limited per client address: 3 attempts per 10 seconds. The
container learns that address from the connection itself
(`scripts/serve.ts`), never from a header the client sends, so lying about
it gets an attacker nothing. Served directly, that needs no configuration.

Behind a reverse proxy, every connection comes from the proxy, so all clients
would share one allowance. To limit each client on its own:

1. Set `TRUSTED_PROXIES` in `.env` to the address or CIDR range the proxy
   connects to the app from, as the app container sees it. With several
   proxies in a row (say a CDN, then Caddy), list them all,
   comma-separated. Nutria starts at the connection and, while it comes from
   a trusted proxy, believes the address that proxy reports in
   `X-Forwarded-For`; the first untrusted address is the client.
2. Have the proxy append the client address to `X-Forwarded-For` (Caddy and
   Traefik do by default; nginx needs
   `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).
3. Have the proxy send `Strict-Transport-Security`. Nutria does not, since it
   may be served over plain HTTP on a local network.

A client that reaches the app port directly is still limited by its own
address, so leaving the port open next to the proxy does not weaken the limit.
The container refuses to start if an entry is not an IP address or CIDR range.

Outside the container (`npm start`, `next dev`) the address is not resolved:
production then puts every client in one shared allowance and logs a warning
about it on the first sign-in.

Food search is limited per account (30 searches a minute) rather than per
address, since it requires a session.

### Security headers

Every response carries `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy`
(`src/lib/security/headers.ts`). Pages also get a `Content-Security-Policy`
with a fresh nonce per request, set in `src/proxy.ts`
(`src/lib/security/csp.ts`): only scripts carrying the nonce run, nothing may
frame the app, forms post only to it, and images may come only from Nutria
and Open Food Facts.

### Containers

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
  seconds. Which clients share that allowance depends on `TRUSTED_PROXIES`; see
  [Behind a reverse proxy](#behind-a-reverse-proxy).
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

| Package     | Forced to | Scoped to                                                  | Why                                         | Drop when                                |
| ----------- | --------- | ---------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `minimatch` | 11.0.5    | `@ts-morph/common`, `@typescript-eslint/typescript-estree` | [GHSA-g3hv-75wg-m249][mm] (fixed in 11.0.1) | both parents accept `minimatch@>=11.0.1` |

Both parents only call `minimatch(path, pattern, options)`, which survives the
11.x API removals. `npm audit` also reports an unfixed low-severity advisory in
`deepmerge` ([GHSA-gcqx-w48m-w2h4][dm]), used only by the shadcn CLI.

[mm]: https://github.com/advisories/GHSA-g3hv-75wg-m249
[dm]: https://github.com/advisories/GHSA-gcqx-w48m-w2h4

## License

Nutria's code is released under the [MIT License](LICENSE). It is provided "as
is", with no warranty and no support of any kind.

Third-party code copied into this repository, and the fonts bundled at build
time, keep their own licenses: see
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
