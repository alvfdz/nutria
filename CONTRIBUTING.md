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
push to and pull request against `main` and `develop`. Each run's summary page
shows the coverage totals, and the full HTML report is attached as the
`coverage` artifact for 14 days. A PR that touches `docs/` also builds the
documentation site, which publishes from `main` only.

`main` and `develop` only change through pull requests. A PR merges once CI
passes and a code owner (listed in `.github/CODEOWNERS`) approves it.

A new or changed setting, command or behavior updates this guide,
`.env.example` and, when users or self-hosters see it, the documentation
site in the same change.

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
against `develop` (security updates go to `main`):
packages that must move together (Next.js, Prisma, React, Vitest, Tailwind)
share one, and the remaining minor and patch updates share another. New
releases wait 3 days (majors 7) before being proposed. Two things it doesn't
handle:

- `allowScripts` in `package.json` names `prisma`, `@prisma/engines` and
  `unrs-resolver` with their exact versions. When one of them changes, update
  its entry in the same PR, or npm skips its install script.
- The Node and PostgreSQL images, and the overrides below, are updated by
  hand.

The actions in `.github/workflows/` get their own weekly PR, also against
`develop`.

### Overrides

| Package     | Forced to | Scoped to                                                  | Why                                         | Drop when                                |
| ----------- | --------- | ---------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `minimatch` | 11.0.5    | `@ts-morph/common`, `@typescript-eslint/typescript-estree` | [GHSA-g3hv-75wg-m249][mm] (fixed in 11.0.1) | both parents accept `minimatch@>=11.0.1` |

Both parents only call `minimatch(path, pattern, options)`, which survives the
11.x API removals. `npm audit` also reports an unfixed low-severity advisory in
`deepmerge` ([GHSA-gcqx-w48m-w2h4][dm]), used only by the shadcn CLI.

[mm]: https://github.com/advisories/GHSA-g3hv-75wg-m249
[dm]: https://github.com/advisories/GHSA-gcqx-w48m-w2h4
