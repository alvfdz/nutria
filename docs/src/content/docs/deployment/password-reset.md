---
title: Password reset
description: Get back into your account from the server.
sidebar:
  order: 4
---

Nutria sends no email, so there is no "forgot password" link. Anyone with shell access to the server can reset the password instead.

This applies to a self-hosted instance. The [desktop app](/nutria/desktop/linux/) has no password reset yet.

From the folder that holds `compose.yaml`:

```bash
docker compose exec app reset-password
```

It asks for the new password without echoing it, then signs the account out everywhere.

For scripts, pass the password in `NUTRIA_NEW_PASSWORD`:

```bash
docker compose exec -e NUTRIA_NEW_PASSWORD="$PASSWORD" app reset-password
```

:::tip
If you still know your password, change it from the [Account](/nutria/guide/account/) page instead.
:::
