# Guide for coding agents

## Read first

- [`docs/vision.md`](docs/vision.md) before any change: keep it within the product scope and stack.
- [`docs/design-system.md`](docs/design-system.md) for any screen. Bring the parts you touch up to it, and extend it when the work needs something it doesn't cover.
- [`README.md`](README.md) to run, deploy or migrate.

## Project rules

- **Scope every query to its owner.** Repository functions take the `userId` and filter by it, on reads and writes alike. An unscoped query is a data leak.
- **Authenticate server actions first.** Call `requireUser()` at the top, outside any `try/catch`, which would swallow its redirect.
- **Keep the domain shape.** `src/lib/<domain>/` splits into `repository.ts`, `schema.ts`, `errors.ts`, `form-state.ts` and `types.ts`. Server actions live in `src/app/(app)/<route>/actions.ts`.
- **Migrations are append-only.** Edit `prisma/schema.prisma`, then `npm run db:migrate -- --name <change>`. Never edit a committed migration, or `src/generated/`.
- **Docs move with the code.** A new or changed setting, command or behavior updates the README and `.env.example` in the same change, and the documentation site in `docs/src/content/docs/` when users or self-hosters see it (screenshots included).
- **AI tooling stays vendor-neutral.** Rules live here and in `.agents/skills/`; tool-specific configuration stays local.

## Code standards

- **TSDoc on every export**: purpose, parameters, return value and thrown errors.
- **Tests ship with the code**, covering the happy path and the edge cases. They live in `__tests__/` next to the code; fixtures are in `test/factories.ts`.

## Before you finish

```bash
npm run format && npm run lint && npm run typecheck && npm test
```

## Third parties

Nutria is MIT-licensed. Check the license and terms before adding a package, copied code or assets, or an external service or data source.

- **Stop and ask** before adding anything copyleft or non-commercial (GPL, AGPL, SSPL, CC BY-NC…), unlicensed, or with terms you can't confirm.
- **Copied code, assets and external data sources** get an entry in `THIRD_PARTY_NOTICES.md` in the same change. External services and data also need the attribution their terms require, in the README's License section and, where users see the data, in the UI.
- **No third-party logos or brand names** without permission.

## Working style

- Keep output clear and to the point.
- Split independent tasks so they can run in parallel.
- **Never commit on your own.** Commit only when asked.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
