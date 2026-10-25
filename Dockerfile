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

# The Prisma CLI (a dev dependency) and the config it loads, installed on their
# own at the versions pinned in package.json so the runtime image does not carry
# the whole dev tree.
FROM base AS prisma-cli
COPY package.json ./
RUN npm install --prefix /opt/prisma --no-audit --no-fund \
    "prisma@$(node -p "require('./package.json').devDependencies.prisma")" \
    "@next/env@$(node -p "require('./package.json').dependencies['@next/env']")"
COPY prisma /opt/prisma/prisma
COPY prisma.config.ts /opt/prisma/

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup -S -g 1001 nutria && adduser -S -u 1001 -G nutria nutria
COPY --from=build --chown=nutria:nutria /app/.next/standalone ./
COPY --from=build --chown=nutria:nutria /app/.next/static ./.next/static
COPY --from=build --chown=nutria:nutria /app/public ./public
COPY --from=prisma-cli --chown=nutria:nutria /opt/prisma /opt/prisma
USER nutria
EXPOSE 3000
CMD ["sh", "-c", "cd /opt/prisma && node_modules/.bin/prisma migrate deploy && cd /app && exec node server.js"]
