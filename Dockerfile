# Multi-stage build for Nutria. Build with `podman build -t nutria .` (or
# `docker build`). The container applies pending Prisma migrations on every
# start and then serves the app, so a database is the only thing it needs.

FROM docker.io/library/node:24-alpine AS base
WORKDIR /app

# Full dependency tree (dev dependencies included), needed to build. `postinstall`
# runs `prisma generate`, so the schema has to be present first.
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# The image's admin tooling, installed on its own so the runtime image does not
# carry the whole dev tree: the Prisma CLI (a dev dependency) and the config it
# loads, plus the `reset-password` command and the packages it imports. Versions
# are the ones pinned in package.json. The command runs from its TypeScript
# source on Node's built-in type stripping, at the paths its imports expect.
FROM base AS tools
COPY package.json ./
RUN npm install --prefix /opt/tools --no-audit --no-fund \
    "prisma@$(node -p "require('./package.json').devDependencies.prisma")" \
    "@next/env@$(node -p "require('./package.json').dependencies['@next/env']")" \
    "pg@$(node -p "require('./package.json').dependencies.pg")" \
    "better-auth@$(node -p "require('./package.json').dependencies['better-auth']")"
COPY prisma /opt/tools/prisma
COPY prisma.config.ts /opt/tools/
COPY scripts/reset-password.ts /opt/tools/scripts/
COPY src/lib/auth/reset-password.ts src/lib/auth/limits.ts /opt/tools/src/lib/auth/

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S -g 1001 nutria && adduser -S -u 1001 -G nutria nutria
# `podman compose exec app reset-password [email]` for a locked-out owner.
RUN printf '%s\n' '#!/bin/sh' \
    'exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON /opt/tools/scripts/reset-password.ts "$@"' \
    > /usr/local/bin/reset-password && chmod 755 /usr/local/bin/reset-password
COPY --from=build --chown=nutria:nutria /app/.next/standalone ./
COPY --from=build --chown=nutria:nutria /app/.next/static ./.next/static
COPY --from=build --chown=nutria:nutria /app/public ./public
COPY --from=tools --chown=nutria:nutria /opt/tools /opt/tools
# The entrypoint that stamps each request with its real client address before
# starting `server.js` (see `scripts/serve.ts`), and the one module it loads.
# Both run from their TypeScript source, like `reset-password`.
COPY --chown=nutria:nutria scripts/serve.ts ./scripts/
COPY --chown=nutria:nutria src/lib/auth/client-ip.ts ./src/lib/auth/
USER nutria
EXPOSE 3000
CMD ["sh", "-c", "cd /opt/tools && node_modules/.bin/prisma migrate deploy && cd /app && exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/serve.ts"]
