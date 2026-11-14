---
title: Windows
description: Install Nutria as a desktop app on Windows, with nothing to configure.
sidebar:
  order: 2
---

The desktop app is Nutria in a window on your own computer. There is no server to set up and nothing to configure: you install it, open it and create your account.

It is for people who would rather not run a server. [Self-hosting](/nutria/deployment/self-hosting/) remains the main way to run Nutria, and the one to choose if you want to reach it from your phone or from more than one device.

:::caution[New and little tested]
The Windows app is built automatically and has seen far less use than the Linux one. Please [report problems](https://github.com/alvfdz/nutria/issues).
:::

## Install

1. Open the [latest release](https://github.com/alvfdz/nutria/releases/latest) and, under **Assets**, download the file ending in `-setup.exe`.
2. Open the downloaded file.
3. Windows shows **Windows protected your PC**. Choose **More info**, then **Run anyway**.

Nutria installs for your user only, with no questions and no administrator password, then opens. It needs 64-bit Windows 10 or later.

:::note[Why the warning?]
The installer isn't signed: a signature that Windows recognizes has to be bought every year, and Nutria is a free hobby project. Only run an installer you downloaded from the releases page linked above.
:::

:::note
The Windows app ships with the releases after v0.1.0. A release with no `-setup.exe` file under Assets doesn't have one.
:::

## First launch

Open **Nutria** from the Start menu. It asks you to create an account: see [First run](/nutria/guide/first-run/). From there on, the [user guide](/nutria/guide/first-run/) applies as it is.

The account stays on your computer, like everything else you enter. Nutria still asks for its password because other programs on the same computer can reach the app.

:::caution[Keep your password safe]
The desktop app can't reset a forgotten password yet. Use a password manager, or write it down somewhere safe.
:::

Searching for foods needs an internet connection: the results come from [Open Food Facts](https://world.openfoodfacts.org). Everything else works offline.

## Your data

Your meals, ingredients and plans live in one folder. To open it, press <kbd>Win</kbd> + <kbd>R</kbd>, type this and press <kbd>Enter</kbd>:

```text
%APPDATA%\Nutria
```

To back them up, close Nutria and copy that folder somewhere safe. To restore a backup, close Nutria and put the folder back.

## Updating

The app doesn't update itself. To move to a newer release, download its installer and run it the same way: it replaces the version you have and keeps your data.

:::caution[Updates only go forward]
A newer version may change how your data is stored, and an older version can't open it afterwards. Back up the data folder before updating if you might want to go back.
:::

## Uninstalling

Open **Settings → Apps → Installed apps**, find Nutria and choose **Uninstall**.

Your data stays in its folder. To delete it too, delete the `%APPDATA%\Nutria` folder.

:::danger
Deleting that folder deletes every meal, ingredient and plan for good.
:::

## What to expect

The desktop app is the same Nutria, with less support than a self-hosted instance:

- It runs on one computer, and only while the app is open.
- It has no automatic updates and no password reset.
- It is newer and less tested than the self-hosted setup.
