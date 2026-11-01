/**
 * Renders a macro value for display, dropping the fractional part when it
 * rounds away so values do not carry a trailing ".0". Computed totals often land
 * a hair off a whole number, as with 0.1 + 0.2.
 *
 * @param value Macro quantity to format.
 * @returns The value as a string, at most one decimal place.
 */
export function formatMacro(value: number): string {
  return String(Number(value.toFixed(1)));
}
