---
title: Password reset
description: Get back into your account from the server or the desktop app.
sidebar:
  order: 4
---

Nutria sends no email, so there is no "forgot password" link. You reset the password from the computer Nutria runs on instead.

## Self-hosted

Anyone with shell access to the server can reset the password. From the folder that holds `compose.yaml`:

```bash
docker compose exec app reset-password
```

It asks for the new password without echoing it, then signs the account out everywhere.

For scripts, pass the password in `NUTRIA_NEW_PASSWORD`:

```bash
docker compose exec -e NUTRIA_NEW_PASSWORD="$PASSWORD" app reset-password
```

## Desktop app

1. Open the **Nutria** menu. On Linux and Windows the menu bar is hidden: press **Alt** to show it.
2. Choose **Reset password…** and confirm.
3. Nutria shows a new password once. Choose **Copy**, then **Go to sign in**, and sign in with it.
4. Pick a password of your own on the [Account](/nutria/guide/account/) page.

Resetting signs you out everywhere and leaves your data as it is. Only the person who can open the app with your computer account can reset it, the same way only they can open your data folder.

:::tip
If you still know your password, change it from the [Account](/nutria/guide/account/) page instead.
:::
