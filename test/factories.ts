import type { Ingredient, NewIngredient } from "@/lib/ingredients/types";

/** Sensible defaults for an ingredient, overridable field by field. */
export const ingredientDefaults: NewIngredient = {
  name: "Chicken breast, raw",
  caloriesPer100g: 165,
  proteinPer100g: 31.5,
  carbsPer100g: 0,
  fatPer100g: 3.6,
};

/**
 * Builds a stored ingredient with a deterministic id and timestamp.
 *
 * @param overrides Fields to change on top of {@link ingredientDefaults}.
 */
export function makeIngredient(
  overrides: Partial<Ingredient> = {},
): Ingredient {
  return {
    ...ingredientDefaults,
    id: "ingredient-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Builds the form submission a browser would send for the ingredient form.
 *
 * @param values Fields to set; `null` leaves the field out of the submission.
 */
export function makeIngredientFormData(
  values: Record<string, string | null> = {},
): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value === null) {
      formData.delete(key);
      continue;
    }
    formData.set(key, value);
  }

  return formData;
}

/** Builds a complete, valid ingredient submission as strings. */
export function makeValidIngredientFormData(
  overrides: Record<string, string | null> = {},
): FormData {
  return makeIngredientFormData({
    name: ingredientDefaults.name,
    caloriesPer100g: String(ingredientDefaults.caloriesPer100g),
    proteinPer100g: String(ingredientDefaults.proteinPer100g),
    carbsPer100g: String(ingredientDefaults.carbsPer100g),
    fatPer100g: String(ingredientDefaults.fatPer100g),
    ...overrides,
  });
}
