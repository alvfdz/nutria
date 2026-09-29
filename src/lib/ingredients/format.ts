/**
 * Renders a macro value for display, dropping the fractional part when the
 * value is whole so integers do not carry a trailing ".0".
 *
 * @param value Macro quantity to format.
 * @returns The value as a string, at most one decimal place.
 */
export function formatMacro(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
