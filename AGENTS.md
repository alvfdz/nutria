# Before doing any change

Check the `docs/vision.md`. Make sure that any suggested change is aligned with the product vision and tech stack described there.

For any UI work, on any screen, follow `docs/design-system.md`. When you change an existing view, bring the parts you touch up to it. If the work needs something it doesn't cover, extend the document in the same change.

# Code standards

- Document the code with TSDoc comments. Every exported function, type, and constant gets a TSDoc block explaining its purpose, parameters, return value, and thrown errors.
- Add unit tests for any new code. New behavior is expected to ship with tests that cover both the happy path and the edge cases.
- Format the code with Prettier — run `npm run format` (or `npm run format:check` to verify) after making changes.
- Run the tests with `npm test` after every change, and make sure they pass before considering the work done.

# Third parties

Nutria is MIT-licensed. Before adding an npm package, copied code or assets, or an external service or data source, check its license and terms.

- **Licenses:** stop and ask before adding anything under a copyleft or non-commercial license (such as GPL, AGPL, SSPL or CC BY-NC), with no license, or with terms you can't confirm.
- **Copied code and assets:** add the source and license notice to `THIRD_PARTY_NOTICES.md` in the same change. This includes components added with the shadcn CLI from another registry. Packages installed through npm carry their own notices.
- **External services and data:** follow their attribution and usage terms, and record them in the README's License section and, where users see the data, in the UI. See the source credit in `docs/design-system.md`. List external data sources in `THIRD_PARTY_NOTICES.md`, pointing to the README rather than repeating its terms.
- **Trademarks:** a code license doesn't cover logos or brand names, so don't add third-party ones without permission.

# Behavior

- Keep the output clear and straight to the point. Avoid unnecessary wording or overexplanation.
- Proactively identify tasks that could be done in parallel. Spawn subagents when possible.
- **Do not commit** anything by yourself.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
