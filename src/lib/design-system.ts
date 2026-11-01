/**
 * Lucide stroke width across the app, from the Iconography section of
 * `docs/design-system.md`. Pass it as `strokeWidth`.
 */
export const ICON_STROKE = 1.8;

/** The space between a value and its unit, as in `150 g`. */
export const THIN_SPACE = " ";

/**
 * A design-system card: 1px border, 12px radius, no ring, and 24px padding that
 * tightens to 16px on phones so a row keeps room for its name. The radius is
 * forced because `cn` cannot tell a custom token conflicts with the card's own.
 */
export const CARD_CLASS =
  "rounded-card! border border-border ring-0 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]";

/** Heading weight and rhythm of a card or dialog title. */
export const CARD_TITLE_CLASS = "text-base/6 font-semibold";

/**
 * What a floating layer needs while the palette is scoped: it renders in a
 * portal outside its view's `nutria-theme` subtree, so it opts in itself and
 * sets `tabular-nums` again for the same reason.
 */
export const OVERLAY_THEME_CLASS = "nutria-theme tabular-nums";
