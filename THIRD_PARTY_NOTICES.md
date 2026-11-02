# Third-party notices

This repository includes code and documents copied from the projects below. They keep their own licenses. Packages installed through npm carry their own license files and aren't listed here. External data sources are listed at the end.

## shadcn/ui

- **Source:** <https://github.com/shadcn-ui/ui>
- **Used in:** `src/components/ui` (components, which may have been modified) and `.agents/skills/shadcn`
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

## Vercel React Best Practices

- **Source:** <https://github.com/vercel-labs/agent-skills>
- **Used in:** `.agents/skills/vercel-react-best-practices`
- **Author:** Vercel
- **License:** MIT, as declared in the upstream README and the skill's `SKILL.md`. The upstream repository publishes no license file or copyright line to reproduce here.

## Frontend Design

- **Source:** <https://github.com/anthropics/skills>
- **Used in:** `.agents/skills/frontend-design`
- **License:** see [`.agents/skills/frontend-design/LICENSE.txt`](.agents/skills/frontend-design/LICENSE.txt)

## External data sources

These aren't included in this repository; Nutria fetches their data at runtime.

### Open Food Facts

- **Source:** <https://world.openfoodfacts.org>
- **Used for:** food search results, and the products users import into their own library
- **License and terms:** see [Food data](README.md#food-data) in the README
