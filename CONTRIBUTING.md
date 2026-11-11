# Contributing to Nutria

This guide covers working on Nutria's code. To run an instance, see the
[self-hosting guide](https://alvfdz.github.io/nutria/deployment/self-hosting/).

Nutria is a hobby project: read the [code of conduct](CODE_OF_CONDUCT.md)
for how to behave and what to expect from the maintainer.

Read these before you change anything:

- [`docs/vision.md`](docs/vision.md): product scope, workflow and architecture.
- [`docs/design-system.md`](docs/design-system.md): the rules for every screen.
- [`AGENTS.md`](AGENTS.md): project rules and code standards. It is written
  for coding agents, but the rules apply to everyone.

## Prerequisites

- Node.js 22.18 or newer (developed on 24.x; `.nvmrc` selects it for nvm, fnm
  and similar tools).
- Docker with Docker Compose. Podman works too, with a Compose provider:
  replace `docker compose` with `podman compose` below.

## Development setup

```bash
npm install
docker compose -f compose.dev.yaml up -d --wait   # PostgreSQL only
npm run db:deploy                                 # apply the migrations
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A fresh database sends
you to `/setup` to create the owner account.

`--wait` blocks until the database healthcheck passes, so the migrations
cannot race it. The data lives in the `nutria-dev-postgres` volume and
survives restarts. `docker compose -f compose.dev.yaml down -v` deletes it.

### Configuration

Development needs no configuration. `next dev`, the Prisma CLI and `scripts/`
load the committed `.env.development`, which holds the development database
URL and a public development secret. Development and self-hosting are
configured separately:

|               | Development                     | Self-hosting                   |
| ------------- | ------------------------------- | ------------------------------ |
| Compose file  | `compose.dev.yaml` (database)   | `compose.yaml` (app, database) |
| Configuration | `.env.development` (committed)  | `.env` (from `.env.example`)   |
| Read by       | Next.js, Prisma CLI, `scripts/` | Compose                        |
| Overrides     | `.env.development.local`        | none                           |

To change a development value, put it in `.env.development.local`
(gitignored). A self-hosting `.env` in the same checkout is also loaded, but
`.env.development` wins over it. See the Next.js guide to
[environment variables](https://nextjs.org/docs/app/guides/environment-variables)
for the full order.

`.env.development` applies to `next dev` only. `npm run build` and
`npm start` run in production mode and skip it, so a production build run
outside the container needs `DATABASE_URL`, `BETTER_AUTH_SECRET` and
`BETTER_AUTH_URL` from the environment or a gitignored
`.env.production.local`.

### Running outside the container

The container resolves each client's address from the connection
(`scripts/serve.ts`), which the sign-in rate limit relies on. `next dev` and
`npm start` don't: in production mode every client then shares one sign-in
allowance, and the app logs a warning about it on the first sign-in.

To build the production image on its own: `docker build -t nutria .`

## Commands

| Command                            | What it does                                          |
| ---------------------------------- | ----------------------------------------------------- |
| `npm run dev`                      | Starts the dev server                                 |
| `npm run build`                    | Production build                                      |
| `npm test`                         | Runs the Vitest suite                                 |
| `npm run test:watch`               | Runs Vitest in watch mode                             |
| `npm run test:coverage`            | Runs the suite with coverage                          |
| `npm run typecheck`                | Generates the route types, then runs `tsc --noEmit`   |
| `npm run lint`                     | ESLint                                                |
| `npm run format`                   | Prettier, writing in place                            |
| `npm run db:generate`              | Regenerates the Prisma client into `src/generated`    |
| `npm run db:migrate -- --name <x>` | Creates and applies a migration after a schema change |
| `npm run db:deploy`                | Applies pending migrations without prompting          |
| `npm run db:reset`                 | Drops the schema, replays every migration, re-seeds   |
| `npm run db:studio`                | Opens Prisma Studio at localhost:5555                 |
| `npm run auth:reset-password`      | Resets the owner account's password                   |
| `npm run desktop:start`            | Builds the desktop app and opens it                   |
| `npm run desktop:flatpak`          | Builds the desktop app's Flatpak bundle               |

`prisma generate` runs on `npm install`. On a checkout where it hasn't run
yet, run `npm run db:generate` before `typecheck` or `build`: both need the
generated client.

`auth:reset-password` targets the database in `.env.development` unless
`DATABASE_URL` is set. It prompts for the password without echoing it, or
reads `NUTRIA_NEW_PASSWORD`, and signs the account out everywhere. Nutria has
one account; if a development database holds more, pass the one to reset:
`npm run auth:reset-password -- <email>`.

## Testing

The suite mocks the Prisma client, so it needs neither a database nor a
container. Tests live in `__tests__/` next to the code they cover; shared
fixtures are in `test/factories.ts`. After opening a dialog, call
`waitForDialogFocus()` from `test/dialog.ts` before typing into it: the
dialog moves focus to its first field a moment later, which on a slow CI
runner can land mid-typing.

`npm run test:coverage` fails when statements, branches, functions or lines
drop below 99% (`coverage.thresholds` in `vitest.config.mts`). Raise the floor
as coverage grows; don't lower it to get a change through.

## Before you open a pull request

```bash
npm run format && npm run lint && npm run typecheck && npm test
```

CI (`.github/workflows/ci.yml`) runs the same checks, with coverage, on every
push to and pull request against `main`. Each run's summary page
shows the coverage totals, and the full HTML report is attached as the
`coverage` artifact for 14 days. A second job runs the
[desktop app](#desktop-app)'s own typecheck and tests. A PR that touches
`docs/` also builds the documentation site, which publishes from `main` only.

Work is trunk-based: branch from `main` and open a pull request back into it.
`main` only changes through pull requests. A PR merges once CI passes and a
code owner (listed in `.github/CODEOWNERS`) approves it.

A new or changed setting, command or behavior updates this guide,
`.env.example` and, when users or self-hosters see it, the documentation
site in the same change.

## Desktop app

`desktop/` holds the desktop app: the same Nutria, for people who can't
self-host. It is a package of its own, so none of its dependencies reach the
container image, and nothing under `src/` knows about it. It wraps the app
instead of changing it:

- `src/main.ts` is the Electron window. It starts `src/server.ts` in a
  background process and opens `http://127.0.0.1:<port>`.
- `src/server.ts` does what the container's start command does: it brings
  the database up to date, then starts the standalone Next.js server.
- `src/database.ts` runs the database, PostgreSQL as WebAssembly
  ([PGlite](https://pglite.dev)), and serves it over a Unix socket, so the
  app connects with the same `pg` driver it uses against a real server.
- `src/migrate.ts` applies `prisma/migrations` without the Prisma CLI,
  recording them in Prisma's own table.
- `src/settings.ts` keeps the generated `BETTER_AUTH_SECRET` and the port in
  the app's data folder.

```bash
cd desktop
npm install
npm start              # build Nutria and open it in a window
npm run typecheck && npm test
```

`npm start` runs `next build` first; `node scripts/build.mjs --skip-next`
reuses the last one. The data of an app started this way lives in
`~/.config/Nutria`; pass `-- --user-data-dir=<folder>` to `npm start` to use
another folder. The tests run the real migrations on PGlite, so a migration
PostgreSQL accepts but PGlite doesn't fails there.

### Building the Flatpak

You need Flatpak with the Flathub remote, and `flatpak-builder`, from your
distribution or as a Flatpak:

```bash
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub org.flatpak.Builder   # unless flatpak-builder is installed
```

Then, from the repository root:

```bash
npm run desktop:flatpak
flatpak install --user desktop/release/nutria-*.flatpak
flatpak run io.github.alvfdz.Nutria
```

The first build downloads the runtime, the SDK and the Electron base app the
manifest names (about 1 GB). The steps, each a script in `desktop/scripts/`:

| Script            | What it does                                                                  |
| ----------------- | ----------------------------------------------------------------------------- |
| `npm run build`   | `next build`, then bundles the two processes and stages the server in `dist/` |
| `npm run package` | `build`, then electron-builder makes `release/linux-unpacked`                 |
| `npm run flatpak` | `package`, then wraps it with `flatpak/io.github.alvfdz.Nutria.yml`           |

The installed app keeps its data in `~/.var/app/io.github.alvfdz.Nutria`.

Next.js copies the checkout's `.env` files into its standalone output. The
build leaves them out, and both `build` and `package` fail if one gets
through: a self-hosting `.env` in your checkout must never ship.

### Releases

Publishing a GitHub release runs `.github/workflows/desktop-release.yml`,
which builds the bundle with the same script and attaches it to the release.
The app takes its version from the root `package.json`, and the workflow
fails when the release tag doesn't match it. To try the build on a branch,
run the workflow by hand: the bundle is then an artifact of the run.

Bump the runtime in the manifest (`runtime-version` and `base-version`) by
hand when Flathub announces the current one's end of life.

## Documentation site

The site in `docs/` is built with Astro Starlight and published to GitHub
Pages on every push to `main` that touches `docs/`
(`.github/workflows/docs.yml`). To preview it:

```bash
cd docs
npm install
npm run dev
```

Pages live in `docs/src/content/docs/`, screenshots in
`docs/src/assets/screenshots/`.

## AI agent skills

`AGENTS.md` gives coding agents the project's rules, and `.agents/skills/`
holds skills they load for specific tasks. Only skills written for this
project are committed. The third-party ones (shadcn, Vercel's React best
practices, Anthropic's frontend design) are pinned in `skills-lock.json` and
restored with:

```bash
npx skills experimental_install
```

## Dependencies

Before adding a package, copied code or an external service, check its
license: see [Third parties](AGENTS.md#third-parties).

Dependabot (`.github/dependabot.yml`) opens a weekly batch of grouped PRs
against `main`: packages that must move together (Next.js, Prisma, React, Vitest, Tailwind)
share one, and the remaining minor and patch updates share another. New
releases wait 3 days (npm majors 7) before being proposed. The desktop app's
packages (`desktop/package.json`) share one more weekly PR; its `pg`,
`typescript`, `vitest` and `@types/*` are only used by its checks, so keep
them on the root's versions. Two things it doesn't handle:

- `allowScripts` in `package.json` names `prisma`, `@prisma/engines` and
  `unrs-resolver` with their exact versions. When one of them changes, update
  its entry in the same PR, or npm skips its install script.
- The Node and PostgreSQL images, and the overrides below, are updated by
  hand.

The actions in `.github/workflows/` get their own weekly PR.

### Overrides

| Package     | Forced to | Scoped to                                                  | Why                                         | Drop when                                |
| ----------- | --------- | ---------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `minimatch` | 11.0.5    | `@ts-morph/common`, `@typescript-eslint/typescript-estree` | [GHSA-g3hv-75wg-m249][mm] (fixed in 11.0.1) | both parents accept `minimatch@>=11.0.1` |

Both parents only call `minimatch(path, pattern, options)`, which survives the
11.x API removals. `npm audit` also reports an unfixed low-severity advisory in
`deepmerge` ([GHSA-gcqx-w48m-w2h4][dm]), used only by the shadcn CLI.

In `desktop/`, `npm audit` reports the same `minimatch` advisory through
electron-builder. It isn't overridden there: electron-builder's own
dependencies need several `minimatch` majors at once, and forcing one breaks
the tree. It runs at build time only, on patterns from
`desktop/electron-builder.yml`.

[mm]: https://github.com/advisories/GHSA-g3hv-75wg-m249
[dm]: https://github.com/advisories/GHSA-gcqx-w48m-w2h4
