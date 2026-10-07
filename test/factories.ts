import type { Ingredient, NewIngredient } from "@/lib/ingredients/types";
import type { Meal, MealItem, NewMeal } from "@/lib/meals/types";

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

/** Sensible defaults for a meal, overridable field by field. */
export const mealDefaults: NewMeal = {
  name: "Oatmeal & Protein Bowl",
  items: [
    { ingredientId: "9f1c1f9e-0000-4000-8000-000000000001", grams: 80 },
    { ingredientId: "9f1c1f9e-0000-4000-8000-000000000002", grams: 200 },
  ],
};

/**
 * Builds a stored meal with a deterministic id, timestamp, and ordered items
 * whose embedded ingredients reuse {@link ingredientDefaults}.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makeMeal(overrides: Partial<Meal> = {}): Meal {
  const items: MealItem[] = mealDefaults.items.map((item, index) => ({
    ...item,
    id: `meal-item-${index + 1}`,
    sortOrder: index,
    ingredient: makeIngredient({
      id: item.ingredientId,
      name: index === 0 ? "Oats" : "Milk",
    }),
  }));

  return {
    id: "meal-1",
    name: mealDefaults.name,
    createdAt: "2026-01-01T00:00:00.000Z",
    items,
    ...overrides,
  };
}

/**
 * Builds the form submission a browser would send for the meal form. The
 * builder posts one `ingredientId` and one `grams` entry per row, so the rows
 * are appended in order; a `null` half leaves that entry out entirely, which
 * is how a row missing half its fields reaches the validator.
 *
 * @param values Scalar fields to set; `null` leaves the field out.
 * @param items The rows to append, in builder order.
 */
export function makeMealFormData(
  values: Record<string, string | null> = {},
  items: { ingredientId: string | null; grams: string | null }[] = [],
): FormData {
  const formData = makeIngredientFormData(values);

  for (const item of items) {
    if (item.ingredientId !== null) {
      formData.append("ingredientId", item.ingredientId);
    }
    if (item.grams !== null) {
      formData.append("grams", item.grams);
    }
  }

  return formData;
}

/**
 * Builds a complete, valid meal submission as strings.
 *
 * @param overrides Scalar fields to set; `null` leaves the field out.
 * @param items Rows to submit; defaults to {@link mealDefaults}.
 */
export function makeValidMealFormData(
  overrides: Record<string, string | null> = {},
  items?: { ingredientId: string | null; grams: string | null }[],
): FormData {
  return makeMealFormData(
    { name: mealDefaults.name, ...overrides },
    items ??
      mealDefaults.items.map((item) => ({
        ingredientId: item.ingredientId,
        grams: String(item.grams),
      })),
  );
}
