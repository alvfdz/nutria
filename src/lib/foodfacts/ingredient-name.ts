import { MAX_INGREDIENT_NAME_LENGTH } from "@/lib/ingredients/schema";

/** Fewest characters of the product name kept when the brand must be dropped. */
const MIN_NAME_BEFORE_BRAND = 10;

/**
 * Cuts text to a maximum length, ending it with an ellipsis when shortened.
 *
 * @param text Text to shorten.
 * @param max Maximum length of the result, in characters.
 * @returns The text, or its start followed by "…" when it was too long.
 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  // Cut by code points so an emoji is never split into a lone surrogate.
  const kept = [...text.slice(0, max - 1)];
  const last = kept[kept.length - 1];
  if (last && /[\ud800-\udbff]/.test(last)) kept.pop();
  return `${kept.join("").trimEnd()}…`;
}

/**
 * Builds the ingredient name for an imported product, appending the brand in
 * parentheses when it adds information and is not already part of the name.
 * The result never exceeds {@link MAX_INGREDIENT_NAME_LENGTH}: a long product
 * name is shortened with an ellipsis to keep the brand, and the brand is
 * dropped when it would leave too little of the name.
 *
 * @param productName Product name from OpenFoodFacts.
 * @param brand Brand from OpenFoodFacts, if any.
 * @returns The name to store, e.g. `Almond Butter (BrandCo)`.
 */
export function buildIngredientName(
  productName: string,
  brand?: string | null,
): string {
  const trimmedName = productName.trim();
  const trimmedBrand = brand?.trim();
  const max = MAX_INGREDIENT_NAME_LENGTH;

  if (
    trimmedBrand &&
    trimmedName.toLowerCase() !== trimmedBrand.toLowerCase() &&
    !trimmedName.includes(trimmedBrand)
  ) {
    const full = `${trimmedName} (${trimmedBrand})`;
    if (full.length <= max) return full;

    const suffix = ` (${trimmedBrand})`;
    const room = max - suffix.length;
    if (room >= MIN_NAME_BEFORE_BRAND) {
      return `${truncate(trimmedName, room)}${suffix}`;
    }
  }

  return truncate(trimmedName, max);
}
