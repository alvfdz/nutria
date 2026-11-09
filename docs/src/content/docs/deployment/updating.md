---
title: Updating
description: Move your instance to a newer release.
sidebar:
  order: 3
---

Each release is a version tag, such as `v1.2.0`. Before updating, read the notes for every release between yours and the new one on the [releases page](https://github.com/alvfdz/nutria/releases).

From the folder that holds `compose.yaml`, replacing `vX.Y.Z` with the release you're moving to:

```bash
git fetch --tags
git checkout vX.Y.Z
docker compose up -d --build --wait
```

The app container applies any new database migrations as it starts, so there is nothing else to run. Your data stays in its volume.

To see which release you're running:

```bash
git describe --tags
```

:::caution[Updates only go forward]
Migrations change the database for good. Checking out an older release afterwards doesn't undo them, and the older app may not start against the newer database.
:::

## Stopping and removing

```bash
docker compose down      # stop; data is kept
docker compose down -v   # stop and delete the database for good
```

:::danger
`down -v` deletes the database volume and every meal, ingredient and plan in it.
:::
