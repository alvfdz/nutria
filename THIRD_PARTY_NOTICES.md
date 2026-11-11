# Third-party notices

This repository includes code copied from the projects below. They keep their own licenses. Packages installed through npm, and the third-party agent skills restored from `skills-lock.json` (see [AI agent skills](CONTRIBUTING.md#ai-agent-skills)), carry their own license files and aren't listed here. Fonts, external data sources and what the desktop app redistributes are listed at the end.

## shadcn/ui

- **Source:** <https://github.com/shadcn-ui/ui>
- **Used in:** `src/components/ui` (components, which may have been modified)
- **License:** MIT

```text
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fonts

These aren't included in this repository; `next/font` downloads them from Google Fonts at build time and bundles them with the built app.

### Geist and Geist Mono

- **Source:** <https://fonts.google.com/specimen/Geist>, <https://github.com/vercel/geist-font>
- **Used for:** all the app's text, and the documentation site (bundled there from the `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` npm packages)
- **License:** [SIL Open Font License 1.1](https://openfontlicense.org)

```text
Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
```

## External data sources

These aren't included in this repository; Nutria fetches their data at runtime.

### Open Food Facts

- **Source:** <https://world.openfoodfacts.org>
- **Used for:** food search results, and the products users import into their own library
- **License and terms:** see [Food data](README.md#food-data) in the README

## Desktop app

These aren't included in this repository. The desktop app's bundle (the Flatpak attached to each release) redistributes them in built form, next to Nutria and its npm dependencies.

### Electron and Chromium

- **Source:** <https://github.com/electron/electron>
- **Used for:** the app's window and the runtime its server runs on
- **License:** MIT (Electron); Chromium and the components it bundles keep their own licenses. The bundle carries both texts, as `LICENSE.electron.txt` and `LICENSES.chromium.html`.

### PGlite

- **Source:** <https://github.com/electric-sql/pglite>
- **Used for:** the desktop app's embedded PostgreSQL database
- **License:** [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0); the PostgreSQL it is built from is under the [PostgreSQL License](https://www.postgresql.org/about/licence/)
