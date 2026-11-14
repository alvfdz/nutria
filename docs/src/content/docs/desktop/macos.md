---
title: macOS
description: Install Nutria as a desktop app on a Mac, with nothing to configure.
sidebar:
  order: 3
---

The desktop app is Nutria in a window on your own computer. There is no server to set up and nothing to configure: you install it, open it and create your account.

It is for people who would rather not run a server. [Self-hosting](/nutria/deployment/self-hosting/) remains the main way to run Nutria, and the one to choose if you want to reach it from your phone or from more than one device.

:::caution[New and little tested]
The macOS app is built automatically and has seen far less use than the Linux one. Please [report problems](https://github.com/alvfdz/nutria/issues).
:::

## Install

1. Open the [latest release](https://github.com/alvfdz/nutria/releases/latest) and, under **Assets**, download the `.dmg` file for your Mac:
   - the one ending in `-arm64.dmg` for a Mac with an Apple processor (M1 or later);
   - the one ending in `-x64.dmg` for a Mac with an Intel processor.
2. Open the downloaded file and drag **Nutria** onto the **Applications** folder next to it.
3. Eject the **Nutria** disk in the Finder's sidebar. You can delete the downloaded file.

Nutria needs macOS 13 (Ventura) or later.

:::tip[Which processor does my Mac have?]
Open the Apple menu and choose **About This Mac**. It shows either **Chip**, followed by an Apple processor such as M1, or **Processor**, followed by an Intel one.
:::

:::note
The macOS app ships with the releases after v0.1.0. A release with no `.dmg` file under Assets doesn't have one.
:::

## First launch

The first time you open Nutria, macOS stops it and says that **Apple could not verify "Nutria" is free of malware**. To open it anyway:

1. Choose **Done** in that message.
2. Open **System Settings → Privacy & Security** and scroll down to **Security**.
3. Next to the line saying that Nutria was blocked, choose **Open Anyway**.
4. Confirm with **Open Anyway**, then with your password or Touch ID.

On macOS 13 and 14 there is a shorter way: hold <kbd>Control</kbd> and click Nutria in the Applications folder, choose **Open**, then **Open** again.

You only do this once. From then on Nutria opens like any other app.

:::note[Why the warning?]
Apple only vouches for apps from developers who pay for a yearly membership, and Nutria is a free hobby project. Only open an app you downloaded from the releases page linked above.
:::

Nutria then asks you to create an account: see [First run](/nutria/guide/first-run/). From there on, the [user guide](/nutria/guide/first-run/) applies as it is.

The account stays on your computer, like everything else you enter. Nutria still asks for its password because other programs on the same computer can reach the app.

:::tip[Forgot your password?]
In the **Nutria** menu at the top of the screen, choose **Reset password…**. See [Password reset](/nutria/deployment/password-reset/#desktop-app).
:::

Searching for foods needs an internet connection: the results come from [Open Food Facts](https://world.openfoodfacts.org). Everything else works offline.

## Your data

Your meals, ingredients and plans live in one folder. To open it, choose **Go → Go to Folder…** in the Finder, type this and press <kbd>Return</kbd>:

```text
~/Library/Application Support/Nutria
```

To back them up, quit Nutria and copy that folder somewhere safe. To restore a backup, quit Nutria and put the folder back.

## Updating

The app doesn't update itself. To move to a newer release, quit Nutria, download the new `.dmg` file and drag Nutria onto the Applications folder again, choosing **Replace**. Your data is kept. macOS asks you to allow the new version the same way as on the [first launch](#first-launch).

:::caution[Updates only go forward]
A newer version may change how your data is stored, and an older version can't open it afterwards. Back up the data folder before updating if you might want to go back.
:::

## Uninstalling

Quit Nutria and drag it from the Applications folder to the Trash.

Your data stays in its folder. To delete it too, delete the `~/Library/Application Support/Nutria` folder.

:::danger
Deleting that folder deletes every meal, ingredient and plan for good.
:::

## What to expect

The desktop app is the same Nutria, with less support than a self-hosted instance:

- It runs on one computer, and only while the app is open.
- It has no automatic updates.
- It is newer and less tested than the self-hosted setup.
