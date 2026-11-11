---
title: Linux
description: Install Nutria as a desktop app on Linux, with nothing to configure.
sidebar:
  order: 1
---

The desktop app is Nutria in a window on your own computer. There is no server to set up and nothing to configure: you install it, open it and create your account.

It is for people who would rather not run a server. [Self-hosting](/nutria/deployment/self-hosting/) remains the main way to run Nutria, and the one to choose if you want to reach it from your phone or from more than one device.

:::note[Other systems]
This page is about the Flatpak, for 64-bit Intel and AMD computers. There is also a [Windows app](/nutria/desktop/windows/). A macOS version is planned.
:::

## Install

1. If your system doesn't have Flatpak yet, [set it up](https://flatpak.org/setup/). Fedora, Linux Mint and many others include it.
2. Open the [latest release](https://github.com/alvfdz/nutria/releases/latest) and, under **Assets**, download the file ending in `.flatpak`.
3. Open the downloaded file. Your software center (GNOME Software, KDE Discover…) shows Nutria: choose **Install**.

The first install also downloads the runtime Nutria needs from Flathub, so it takes a few minutes.

Prefer a terminal? From the folder you downloaded the file to:

```bash
flatpak install --user ./nutria-*.flatpak
```

:::note
The desktop app ships with the releases after v0.1.0. A release with no `.flatpak` file under Assets doesn't have one.
:::

## First launch

Open **Nutria** from your applications. It asks you to create an account: see [First run](/nutria/guide/first-run/). From there on, the [user guide](/nutria/guide/first-run/) applies as it is.

The account stays on your computer, like everything else you enter. Nutria still asks for its password because other programs on the same computer can reach the app.

:::caution[Keep your password safe]
The desktop app can't reset a forgotten password yet. Use a password manager, or write it down somewhere safe.
:::

Searching for foods needs an internet connection: the results come from [Open Food Facts](https://world.openfoodfacts.org). Everything else works offline.

## Your data

Your meals, ingredients and plans live in one folder in your home:

```text
~/.var/app/io.github.alvfdz.Nutria
```

To back them up, close Nutria and copy that folder somewhere safe. To restore a backup, close Nutria and put the folder back.

## Updating

The app doesn't update itself. To move to a newer release, download its `.flatpak` file and install it the same way: it replaces the version you have and keeps your data.

:::caution[Updates only go forward]
A newer version may change how your data is stored, and an older version can't open it afterwards. Back up the data folder before updating if you might want to go back.
:::

## Uninstalling

Remove Nutria from your software center, or run:

```bash
flatpak uninstall io.github.alvfdz.Nutria
```

Your data stays in its folder. To delete it too:

```bash
flatpak uninstall --delete-data io.github.alvfdz.Nutria
```

:::danger
`--delete-data` deletes every meal, ingredient and plan for good.
:::

## What to expect

The desktop app is the same Nutria, with less support than a self-hosted instance:

- It runs on one computer, and only while the app is open.
- It has no automatic updates and no password reset.
- It is newer and less tested than the self-hosted setup. Please [report problems](https://github.com/alvfdz/nutria/issues).
