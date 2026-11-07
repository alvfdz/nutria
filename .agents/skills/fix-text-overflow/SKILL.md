---
name: fix-text-overflow
description: Fixes layout broken by long, unbreakable text - meal, ingredient, food, slot or option names that widen a container, clip without an ellipsis, or add a horizontal scrollbar. Use when a name/label/value is too long for its card, table cell, dialog, popover or picker (combobox/select), when adding a new text field, or when reviewing truncation and ellipsis behavior in this codebase (Next.js + Tailwind + Base UI + shadcn).
---

# Fix Text Overflow

This codebase renders user-entered names (meals, ingredients, foods, slot
names, select labels) that can be arbitrarily long and unbreakable. A long
value like `"a".repeat(60)` must be cut off with an ellipsis, never pushed
sideways. Short names hide the bug, so it slips through review.

Use this skill whenever you add or touch a field that shows a name, or when a
long value visibly breaks a layout. The rule itself lives in
`docs/design-system.md` ("Long names truncate on one line…"); this skill is how
to meet it.

## What the bug looks like

- the container (card, dialog, popup, table, tooltip) grows wider than it
  should, or
- the text is clipped mid-glyph with no ellipsis, or
- the whole page gets a horizontal scrollbar.

## Why it happens: min-content propagates up the tree

A box's **automatic minimum size** is its `min-content` size, which for
unbreakable text is the whole word. That minimum climbs upward:

- a **grid track** with `auto` sizing takes its minimum from its items'
  minimum contributions, so it grows to fit the long word;
- a **flex container**'s min-content comes from its items, so nesting does not
  stop it;
- the climb only stops at an ancestor with a **definite width** (fixed px/rem,
  `w-full` of a definite parent, a `w-86` popup, `w-(--anchor-width)`, ...).

`truncate` (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`)
on the text itself does **not** stop it: `overflow: hidden` zeroes only that
box's automatic minimum, not its min-content contribution to its parent. A name
span with `truncate` can still widen everything above it.

`min-w-0` is the switch that zeroes an item's automatic minimum so it can shrink
inside a definite parent. On a grid item it also zeroes the track's minimum
contribution, which is what actually stops a runaway track.

## The fix, as rules

1. **The text box.** Single-line label/value: `truncate` + `title={value}` so
   the full string is on hover. Running prose (a sentence mentioning the name):
   `wrap-anywhere` so the long token wraps.
2. **Every flex/grid item on the path** from the text up to the nearest
   definite-width ancestor needs `min-w-0`. Missing one grid item leaves a
   track that grows. When unsure, add it to all of them; it is harmless.
3. **The element that sizes itself from its content** needs `min-w-0` too.
   A picker's input or trigger is the usual case: it keeps its min-content
   width, stretching itself and the popup that mirrors it via
   `--anchor-width`. The `Combobox` input in the meal builder needs
   `min-w-0`, and so will a `Select` trigger if one is added (shadcn's is
   `w-fit`).
4. **Siblings that must never shrink** (kcal numbers, percentages, badges) get
   `shrink-0`.
5. **Tables.** Use `table-fixed` and give the non-name columns explicit narrow
   widths (e.g. `w-20`); the name column then absorbs the rest and a block
   `div.truncate` in the cell clips. `auto` table layout lets the long cell win.
6. **Popups.** A popover/tooltip with no width shrinks-to-fit and grows to its
   content's max-content. Give the popup a definite width at the call site (the
   food panel uses `w-86`) or cap the content. `Combobox` popups are already
   pinned with `w-(--anchor-width)`.

## Reference fixes

Truncating a flex row (calendar slot card): the row and its grid both needed
`min-w-0`, because the grid track was sizing to the name.

```tsx
// before
<span className="grid gap-0.5">
  <span className="flex items-baseline gap-1">
    <span className="min-w-0 flex-1 truncate text-sm">{meal.name}</span>
    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
      {formatMacro(meal.totals.calories)}
    </span>
  </span>
</span>

// after
<span className="grid min-w-0 gap-0.5">
  <span className="flex min-w-0 items-baseline gap-1">
    <span className="min-w-0 flex-1 truncate text-sm" title={meal.name}>
      {meal.name}
    </span>
    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
      {formatMacro(meal.totals.calories)}
    </span>
  </span>
</span>
```

Truncating prose (dialog description): wrap instead of clip.

```tsx
<DialogDescription className="wrap-anywhere">
  Update the ingredients that make up {meal.name}.
</DialogDescription>
```

Fixing a picker (meal builder ingredient `Combobox`): the input sizes itself
from the selected label, so it needs `min-w-0` as well as the truncation, and
each option truncates inside the popup.

```tsx
<ComboboxInput
  className="w-full min-w-0 [&_input]:truncate"
  title={selected?.label}
/>
<ComboboxItem value={option} title={option.label}>
  <span className="min-w-0 truncate">{option.label}</span>
</ComboboxItem>
```

## Diagnose the exact element

jsdom has no layout engine, so a unit test cannot find this. Use a real browser.

1. Reproduce with a 60-char unbroken name in the component's fixtures.
2. Walk the DOM from the text element upward. The first ancestor where
   `clientWidth === scrollWidth` is not constrained - that is where the chain
   is held open. Everything between the text and that ancestor needs `min-w-0`.

```js
// paste in the browser console, replacing the selector with the text element
let node = document.querySelector(".truncate"); // or a data-testid
while (node) {
  const cs = getComputedStyle(node);
  console.log(
    node.tagName,
    String(node.className).slice(0, 50),
    `client=${node.clientWidth} scroll=${node.scrollWidth}`,
    `min-width=${cs.minWidth} overflow=${cs.overflow} display=${cs.display}`,
  );
  node = node.parentElement;
}
```

3. Check the page too: if
   `document.documentElement.scrollWidth > document.documentElement.clientWidth`
   something overflows horizontally.

## Verify in a real browser

A throwaway Vite harness that mounts the component with long-name fixtures and
measures real layout is the reliable check. Minimum harness setup, because the
components import app code:

- alias `@/*` to `src/*`;
- point `@/app/*/actions` at a stub module (they import `next/cache`, which
  does not run in a plain browser bundle);
- alias `server-only` to an empty module;
- define `process.env` (some deps reference it);
- import `src/app/globals.css` so the Tailwind theme applies.

In the page, open any popup/select, then measure:

```js
el.scrollWidth > el.clientWidth; // true = it is actually clipping
document.documentElement.scrollWidth > document.documentElement.clientWidth;
```

Check a normal width and a narrow one (e.g. 380px). Drive it headlessly with
Playwright:

```bash
npm install --no-save playwright   # never add it to package.json
npx playwright install chromium
```

Delete the harness and the `node_modules/playwright*` folders afterwards (they
are not tracked, but keep the tree clean).

## Tests to add

jsdom has no layout, so assert the structure that makes clipping possible:

- the text element has `truncate` (or `wrap-anywhere`) and, for single-line,
  `title` equal to the full value;
- walk the ancestors up to the definite-width container and assert each has
  `min-w-0` (this is the part that silently regresses);
- for a picker, assert its input or trigger has `min-w-0`.

```tsx
const name = screen.getByText(longName);
expect(name).toHaveClass("truncate");
expect(name).toHaveAttribute("title", longName);
// the row and the grid that holds it must be able to shrink
expect(name.parentElement).toHaveClass("min-w-0");
expect(name.parentElement?.parentElement).toHaveClass("min-w-0");
```

## Gotchas

- **`cn` merges Tailwind classes** (the `cn` package, a drop-in for `clsx` +
  `tailwind-merge`). A later conflicting utility wins, so
  `className="w-full"` correctly overrides a base `w-fit`. Pass the class you
  mean; do not reach for `!important`.
- **`truncate` needs a definite width to act on.** If the ancestor is
  content-sized, there is nothing to truncate against.
- **Base UI pickers** (`Combobox`, and `Select` if added) set
  `--anchor-width` on the positioner and the popup uses `w-(--anchor-width)`,
  so the popup matches its input or trigger. Fix that and the popup follows.
- **Overflow pairing:** setting only `overflow-y-auto` makes the browser compute
  `overflow-x` as `auto` too, which clips without an ellipsis. That masking can
  hide the real overflow - fix the chain instead of relying on it.
- **`min-w-0` on the text box alone is never the fix.** The ancestors are.

## Before you finish

Run the checks in `AGENTS.md`.
