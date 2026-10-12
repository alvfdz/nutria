import type { Ingredient, NewIngredient } from "@/lib/ingredients/types";
import type { Goals, NewGoals } from "@/lib/goals/types";
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

/** Sensible defaults for the daily goals, overridable field by field. */
export const goalsDefaults: NewGoals = {
  calories: 2000,
  proteinPct: 30,
  carbsPct: 40,
  fatPct: 30,
  slots: [
    { name: "Breakfast", percent: 30 },
    { name: "Lunch", percent: 40 },
    { name: "Dinner", percent: 30 },
  ],
};

/**
 * Builds stored goals with a deterministic id and timestamps, and slots whose
 * ids and sort order follow the defaults.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makeGoals(overrides: Partial<Goals> = {}): Goals {
  return {
    ...goalsDefaults,
    id: "goals-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    slots: goalsDefaults.slots.map((slot, index) => ({
      ...slot,
      id: `meal-slot-${index + 1}`,
      sortOrder: index,
    })),
    ...overrides,
  };
}

/**
 * Builds the form submission a browser would send for the goals form. The
 * form posts one `slotName` and one `slotPercent` entry per meal, so the rows
 * are appended in order; a `null` half leaves that entry out entirely, which
 * is how a row missing half its fields reaches the validator.
 *
 * @param values Scalar fields to set; `null` leaves the field out.
 * @param slots The rows to append, in dining order.
 */
export function makeGoalsFormData(
  values: Record<string, string | null> = {},
  slots: { name: string | null; percent: string | null }[] = [],
): FormData {
  const formData = makeIngredientFormData(values);

  for (const slot of slots) {
    if (slot.name !== null) {
      formData.append("slotName", slot.name);
    }
    if (slot.percent !== null) {
      formData.append("slotPercent", slot.percent);
    }
  }

  return formData;
}

/**
 * Builds a complete, valid goals submission as strings.
 *
 * @param overrides Scalar fields to set; `null` leaves the field out.
 * @param slots Rows to submit; defaults to {@link goalsDefaults}.
 */
export function makeValidGoalsFormData(
  overrides: Record<string, string | null> = {},
  slots?: { name: string | null; percent: string | null }[],
): FormData {
  return makeGoalsFormData(
    {
      calories: String(goalsDefaults.calories),
      proteinPct: String(goalsDefaults.proteinPct),
      carbsPct: String(goalsDefaults.carbsPct),
      fatPct: String(goalsDefaults.fatPct),
      ...overrides,
    },
    slots ??
      goalsDefaults.slots.map((slot) => ({
        name: slot.name,
        percent: String(slot.percent),
      })),
  );
}
