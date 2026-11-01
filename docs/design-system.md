# Nutria design system

Calm, monochrome nutrition UI built on shadcn/ui — color only where it carries meaning.

These are the style guidelines for every screen and all UI work in Nutria: auth, home, Goals, Ingredients, Meals, Calendar and Account, plus anything added later. The interface stays out of the way: zinc neutrals, borders instead of shadows, one quiet green accent, and three soft macro colors that always mean the same thing. If a screen starts to feel colorful, something is wrong.

New UI follows this document. When you change an existing view, bring the parts you touch up to it (see [Adoption](#adoption)). If a screen needs something not covered here, extend this document in the same change rather than inventing a one-off.

## Principles

1. **Monochrome first.** Layout, hierarchy, navigation and actions come from `foreground`, `muted-foreground`, `border` and type weight — never from color. The primary button is `primary` (near-white in dark), as in shadcn.
2. **Color is data.** `protein`, `carbs` and `fat` appear only as 6px dots, bar segments, progress fills and chart series, always next to their name. Numbers stay `foreground`.
3. **One accent, used sparingly.** `brand` green marks "good / brand / add" in five places only: the logo mark, the ✓ beside a valid or on-target total, the + in Add actions, the 2px underline of a selected segment, and the unsaved-changes dot. Never a fill.
4. **Say how to fix it.** Validation is inline and specific: "Macros total 95% — add 5% to reach 100%", in `destructive` with an alert icon. Never color alone.
5. **Show each number once.** If a value is visualized in one place (a macro bar), don't repeat the same visualization elsewhere on the view (no donut in the summary).
6. **Being off budget is not an error.** Short of or over a target is information the user plans around: show it in neutral text with a marker (`✓`, `−12`, `+8`, `▲`). `destructive` is for failures, invalid input and irreversible actions.

## Color

| Role     | Token                             | Rule                                                                                                                                          |
| -------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Page     | `background`                      | Whole viewport.                                                                                                                               |
| Surface  | `card` + `border`                 | Every card has a 1px border and `radius-card`; no shadow. Floating layers are the exception (see [Overlays](#overlays)).                      |
| Dividers | `border-subtle`                   | Between rows inside a card.                                                                                                                   |
| Text     | `foreground` / `muted-foreground` | Two levels only. Units (kcal, g, %) are always muted.                                                                                         |
| Action   | `primary` / `primary-foreground`  | One primary button per view or dialog. Secondary: outline (`border`); tertiary: ghost (hover `muted`).                                        |
| Current  | `muted` / `primary`               | Monochrome: the current nav item is `muted` + `foreground`; today's date is a `primary` circle.                                               |
| Accent   | `brand`                           | The five uses above.                                                                                                                          |
| Macros   | `protein` `carbs` `fat`           | Fixed order everywhere: Protein, Carbs, Fat. They differ in lightness (carbs lightest, fat darkest) so they stay distinguishable without hue. |
| Meals    | `meal-1` … `meal-4`               | Grayscale, in meal slot order. Past four slots, every slot takes a step of a `primary` opacity ramp instead (`mealTint`).                     |
| Error    | `destructive`                     | Text, icon, the 100% tick on an over-allocated bar, and the tinted `destructive` button that confirms a delete; never a filled banner.        |

### Values by theme

Dark is the default theme; light mirrors it token by token. Build against tokens, never hex or Tailwind palette colors such as `emerald-500`.

| Token                | Dark      | Light     |
| -------------------- | --------- | --------- |
| `background`         | `#09090b` | `#ffffff` |
| `card`, `popover`    | `#0c0c0e` | `#ffffff` |
| `muted`              | `#18181b` | `#f4f4f5` |
| `secondary`,`accent` | `#27272a` | `#e4e4e7` |
| `border`, `input`    | `#27272a` | `#e4e4e7` |
| `border-subtle`      | `#1f1f23` | `#f4f4f5` |
| `foreground`         | `#fafafa` | `#09090b` |
| `foreground-soft`    | `#e4e4e7` | `#27272a` |
| `muted-foreground`   | `#a1a1aa` | `#71717a` |
| `primary`            | `#fafafa` | `#18181b` |
| `primary-foreground` | `#18181b` | `#fafafa` |
| `ring`               | `#71717a` | `#a1a1aa` |
| `brand`              | `#34d399` | `#059669` |
| `protein`            | `#e8858c` | `#d14d5a` |
| `carbs`              | `#e5c07b` | `#c89b3c` |
| `fat`                | `#8f7fe0` | `#6d58d1` |
| `destructive`        | `#fca5a5` | `#dc2626` |
| `meal-1`             | `#52525b` | `#a1a1aa` |
| `meal-2`             | `#a1a1aa` | `#52525b` |
| `meal-3`             | `#e4e4e7` | `#18181b` |
| `meal-4`             | `#71717a` | `#71717a` |

In dark, cards sit one step above the page; in light both are white and the 1px border does the separating. In light, `brand`, the macro colors and `destructive` are deeper versions of their dark values, so the dots, bars and ✓ stay visible on white.

## Typography

Geist (Google Fonts) for everything; Geist Mono only for code or IDs. All numbers use `font-variant-numeric: tabular-nums` so values don't jitter while typing or line up badly across rows.

- `page-title` 28/34 semibold, −0.025em — one per view (`type-page-title`), followed by a one-line `muted-foreground` description in `body`.
- `card-title` 16/24 semibold — card headings (`text-base/6 font-semibold`).
- `stat-lg` 32 semibold — at most one hero number per view (daily kcal; `type-stat-lg`); `stat` 18 semibold in stat tiles.
- `label` 14 medium, `body` 14 regular, `caption` 13 (`type-caption`), `micro` 12 (the floor, including dense views like the calendar).
- Brand moments only — the home hero and the auth wordmark — may go larger, up to 36.

Custom sizes are `type-*` utilities, not `text-*`: `cn` reads an unknown `text-*` class as a color and drops it next to a real one.

Sentence case everywhere ("Save goals", not "Save Goals"), with no uppercase labels. Weights: 400, 500, 600 — no bold 700.

## Layout & spacing

4px base: `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-6` 24 · `space-8` 32 · `space-12` 48.

- Every view uses `PageContainer`. Content width is 1200px max, side gutter 24px (16px on phones). `width="wide"` is the canvas tier, for the calendar board and the site header only.
- View top padding `space-12`; page header to content `space-8`; cards `space-6` padding (`space-4` on phones) and `space-6` apart.
- Dense cards nested in a view, such as calendar slots, use `radius-lg` and `space-3` padding.

Pick the view shape that fits, and stack columns on narrow screens:

| Shape   | Layout                                                                                         | Used by               |
| ------- | ---------------------------------------------------------------------------------------------- | --------------------- |
| Editor  | ≈2/3 editor, ≈1/3 summary sticky under the navbar.                                             | Goals                 |
| Library | One full-width card: filter and add actions above a sortable table. Adding happens in dialogs. | Ingredients, Meals    |
| Canvas  | Full-width board at the wide tier; details open in an anchored panel.                          | Calendar              |
| Form    | One column, `max-w-sm`. Left-aligned in the app; centered under the logo signed out.           | Account, login, setup |

A value is visualized where it is edited, so feedback stays in view when the summary stacks below. Unsaved edits on a full-page editor get a sticky bottom action bar: status text left, Reset (outline) + primary action right.

Radii: `rounded-md` ≈6 for small controls, `rounded-lg` 8 for inputs and buttons, `rounded-card!` 12 for cards, `rounded-full` for dots and bars.

## Components

Built from shadcn/ui primitives in `src/components/ui`; add new ones with the shadcn CLI rather than by hand. Shared ones sit at the top of `src/components` (`segmented-bar.tsx`, `stat-tile.tsx`, `status-line.tsx`, `unit-input.tsx`, and `library-table.tsx` for the Library shape's headings, row names and row actions), and shared class names and constants in `src/lib/design-system.ts`. Others still live with Goals (`split-slider.tsx`): reuse them, and move a component to the shared location the first time a second view needs it, rather than copying it.

- **Button** — primary / outline / ghost / icon, plus the tinted `destructive` for confirming a delete.
- **Field** — shadcn `Field` + `InputGroup` with an inline unit suffix and an optional muted helper line. An error takes the helper line's place. A button inside the field, such as the password reveal, is 24px so it fits the 32px input; `AuthField` is this pattern for the auth forms.
- **SegmentedToggle** — shadcn ToggleGroup styled as a track; for presets and view switches. Not built yet: add it the first time one is needed.
- **MacroBar** — the 6px segmented protein/carbs/fat bar with gaps, plus its status line. It shows how a whole divides up. An over-allocated total scales back to fit and shows a `destructive` tick at 100%.
- **Macro share** — a `MacroBar` under a food's name, showing each macro's share of its calories at a glance. Its proportions complement the grams beside it, so principle 5 isn't broken.
- **Progress bar** — one 6px bar per macro showing planned against target on a `muted` track, filled in that macro's color, with name, `planned/target g` and a state marker above it. An overshoot fills the track and is reported by the marker (principle 6).
- **SplitSlider** — thumbs on a segmented bar's dividers, so dragging or arrow keys trade share between neighbours and keep the total. Shown only while the total is valid; typed inputs always stay available.
- **StatusLine** — ✓ (brand) or alert (destructive) + one sentence.
- **Card** — bordered surface with title, description and an optional header action.
- **StatTile** — a 3-cell bordered row for P/C/F grams.

### Lists and tables

- **Editable lists** are divided rows inside a card — no boxed inputs per row. Names are inline-editable (transparent input, `muted` on hover/focus, always `muted` on touch screens).
- **Row builders** in a dialog, such as a meal's ingredient rows, keep boxed controls: a picker and a quantity need their affordances to be found. A row's errors sit under the whole row, and go away as soon as its field changes. A builder's dialog scrolls its rows and keeps its actions and preview in view.
- **Pickers** use `Combobox` when the list is the user's own and can grow long, as with ingredients, and `Select` for a short fixed list.
- **Phone tables** may give a row two lines when its name cell carries more than a name: name and actions first, numbers below under headings laid out the same way. Headings stay sortable, and the table's parts state their roles.
- **Read-only lists and breakdowns** with several values per row, such as the ingredient and meal libraries or a summary, use a `Table` with right-aligned numeric columns, so the digits line up.
- **Row actions** are ghost icon buttons with explicit `aria-label`s ("Move Lunch up"), folded into one menu on phones.
- **Long names** truncate on one line with `min-w-0 truncate` and the full text in `title`; they never widen their container.

### Overlays

`Dialog` holds create and edit forms that don't fit inline. `AlertDialog` confirms deletes and discarding unsaved work, and names the thing affected. `Popover` holds panels anchored to what opened them, such as the calendar's food panel. Floating layers are the only surfaces that keep a shadow, because they need the elevation.

### Charts

Macro series use `protein`, `carbs` and `fat`, in that order; meal series use the meal greys. Label series directly with their names, and don't chart a value already visualized on the view (principle 5).

### States

- **Empty** — keep the surrounding card and use shadcn `Empty`, with the action that starts the job right there: the Ingredients library opens with a search field, not a sentence describing one.
- **Pending** — disable the control and change its label ("Saving…"). Keep the layout still. Use `Spinner` where a label alone is easy to miss, and `Skeleton` for content still loading.
- **Read-only** — remove the affordance instead of graying it out: a past calendar day is a plain block with nothing focusable.
- **Field errors** — `destructive` text under the field, tied to the input with `aria-describedby`, and `aria-invalid` on the input.
- **Form and request errors** — one `destructive` line above the form's actions with `role="alert"`.
- **Toasts** — confirm a completed save ("Password changed.") or report a failure with no form to show it in. Never use them for validation.

## Iconography

Lucide (shadcn's default), stroke 1.8, 15–16px, `currentColor` in `muted-foreground`; turns `foreground` on hover. The logo mark beside the auth wordmark is the one larger icon, at 32px in `brand`. Icon-only buttons are 32–36px, except inside a field (see **Field**), and always labelled. No emoji, no filled icons, no illustrations in the app chrome.

## Numbers & copy

- Targets and budgets (Goals, Calendar) show integers for grams, kcal and percentages. Ingredient and meal quantities show at most one decimal, with no trailing `.0` (`formatMacro`). Protein and carbs 4 kcal/g, fat 9 kcal/g.
- Format: value, thin space, unit — `150 g`, `2000 kcal`; `%` attaches directly — `30%`. Breakdowns across rows are table columns headed by the macro dot and initial, with the unit in the caption.
- Status copy is short and actionable; no exclamation marks; no "Oops".

## Accessibility

Text ≥ 4.5:1 in both themes (`muted-foreground` is the darkest allowed for small text); focus rings visible on every control (`ring`, 3px); every input has a label (visually hidden where the layout has none); macro colors are never the only cue.

## Using it in code

`src/app/globals.css` is the source of truth for token values; keep the table above in sync with it. Tokens are exposed to Tailwind (`bg-protein`, `text-brand`, `border-border-subtle`…). `foreground-soft` is defined but not yet exposed; add `--color-foreground-soft` to `@theme inline` before using it as a utility.

## Adoption

Goals, Ingredients, Meals, Account, login, setup and the site header follow this system; the rest of the app is being brought over view by view.

- **Theme scope.** The palette lives in `.nutria-theme`, so a view opts in by putting that class on its `<main>`. Portaled content (dialogs, popovers, menus) renders outside that subtree and needs the class on its own content element. Once every view has adopted it, move the values into `:root` and `.dark` and remove the class.
- **Default theme.** With no stored choice, `themeScript` follows the OS preference instead of defaulting to dark.
- **Width.** `PageContainer`'s default tier still steps up to 1280px; views that have adopted this system force 1200px with an override.
- **Page chrome.** Other views still use `text-2xl font-medium` titles and `py-10`, and don't set `tabular-nums` at the view level.
- **Calendar.** Slot cards and the food panel use text below the 12px floor and uppercase labels; progress bars are 8px with a `primary` fill.
- **Add actions.** The + icons outside Goals, Ingredients and Meals aren't `brand` yet.
- **Toasts.** `Toaster` is mounted outside `.nutria-theme`, so toasts keep the old palette until the values move to `:root`.
