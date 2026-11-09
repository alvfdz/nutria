---
title: Self-hosting
description: Run Nutria and its database with one compose file.
sidebar:
  order: 1
---

Nutria runs as two containers, the app and PostgreSQL, from the `compose.yaml` in the repository.

## Prerequisites

- [Docker](https://docs.docker.com/get-started/get-docker/) with Docker Compose.

Nutria runs wherever Docker runs Linux containers: Linux, and macOS or Windows with Docker Desktop.

:::note[Using Podman?]
Podman works too, with a Compose provider. Replace `docker compose` with `podman compose` in every command.
:::

## 1. Get the code

Clone the repository and check out the latest release. Replace `vX.Y.Z` with the newest version on the [releases page](https://github.com/alvfdz/nutria/releases).

```bash
git clone https://github.com/alvfdz/nutria.git
cd nutria
git checkout vX.Y.Z
cp .env.example .env
```

:::caution[Run a release, not `main`]
`main` is the development branch and can hold unfinished work. Its database changes apply as soon as the app starts and can't be undone, so an instance that has run `main` may not be able to go back to a release.
:::

## 2. Configure `.env`

Three values are required. Compose refuses to start while the password or the secret is empty.

| Variable             | What it is                     | Requirements                                                                  |
| -------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`  | Database password              | Any strong password without `@ / : #`                                         |
| `BETTER_AUTH_SECRET` | Signs the session cookies      | A random string of at least 32 characters                                     |
| `BETTER_AUTH_URL`    | The address you open Nutria at | The full origin, e.g. `http://localhost:3000` or `https://nutria.example.com` |

Generate the password and the secret however you like. For example, with `openssl`:

```bash
openssl rand -hex 24      # POSTGRES_PASSWORD
openssl rand -base64 32   # BETTER_AUTH_SECRET
```

:::caution

- The database password is set when the volume is first created; changing it later doesn't change it in an existing database.
- Keep the secret stable: changing it signs everyone out.

:::

Optional settings:

| Variable                       | Default | What it does                                                                        |
| ------------------------------ | ------- | ----------------------------------------------------------------------------------- |
| `APP_PORT`                     | `3000`  | Port on the host                                                                    |
| `TZ`                           | `UTC`   | Your time zone (e.g. `Europe/Madrid`); decides when "today" starts                  |
| `POSTGRES_USER`, `POSTGRES_DB` | —       | Database user and name                                                              |
| `TRUSTED_PROXIES`              | —       | Only behind a reverse proxy; see [Reverse proxy](/nutria/deployment/reverse-proxy/) |

## 3. Start it

```bash
docker compose up -d --build --wait
```

Open `BETTER_AUTH_URL` (by default [http://localhost:3000](http://localhost:3000)). A fresh install takes you to the setup screen to create your account; see [First run](/nutria/guide/first-run/).

## What runs where

- The **app** container applies any pending database migrations every time it starts, then serves Nutria.
- The **database** publishes no port: only the app can reach it, inside the compose network. Its data lives in a named volume and survives restarts and rebuilds.
- Every response carries standard security headers and a strict Content Security Policy.
