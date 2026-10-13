# Before doing any change

Check the `docs/vision.md`. Make sure that any suggested change is aligned with the product vision and tech stack described there.

# Code standards

- Document the code with TSDoc comments. Every exported function, type, and constant gets a TSDoc block explaining its purpose, parameters, return value, and thrown errors.
- Add unit tests for any new code. New behavior is expected to ship with tests that cover both the happy path and the edge cases.
- Format the code with Prettier — run `npm run format` (or `npm run format:check` to verify) after making changes.
- Run the tests with `npm test` after every change, and make sure they pass before considering the work done.

# Behavior

- Keep the output clear and straight to the point. Avoid unnecessary wording or overexplanation.
- Proactively identify tasks that could be done in parallel. Spawn subagents when possible.
- **Do not commit** anything by yourself.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
