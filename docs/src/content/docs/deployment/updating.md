---
title: Updating
description: Move your instance to the latest version.
sidebar:
  order: 3
---

From the folder that holds `compose.yaml`:

```bash
git pull
docker compose up -d --build --wait
```

The app container applies any new database migrations as it starts, so there is nothing else to run. Your data stays in its volume.

## Stopping and removing

```bash
docker compose down      # stop; data is kept
docker compose down -v   # stop and delete the database for good
```

:::danger
`down -v` deletes the database volume and every meal, ingredient and plan in it.
:::
