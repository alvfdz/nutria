import type { Meal } from "./types";

/** The energy and macronutrients a whole meal delivers. */
export type MealTotals = {
  /** Kilocalories of the meal. */
  calories: number;
  /** Protein in grams. */
  protein: number;
  /** Carbohydrates in grams. */
  carbs: number;
  /** Fat in grams. */
  fat: number;
};

/**
 * Sums a meal's macros from its items: each ingredient's density per 100 g is
 * scaled by the quantity the meal uses (`per100g × grams / 100`). Totals are
 * computed live rather than snapshotted, so editing an ingredient's macros
 * updates every meal it belongs to.
 *
 * @param meal The meal (or any object carrying `items`) to total.
 * @returns The sums for the whole meal; zeroes for a meal with no items.
 */
export function computeMealTotals(meal: Pick<Meal, "items">): MealTotals {
  const zero: MealTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return meal.items.reduce<MealTotals>((totals, item) => {
    const share = item.grams / 100;

    return {
      calories: totals.calories + item.ingredient.caloriesPer100g * share,
      protein: totals.protein + item.ingredient.proteinPer100g * share,
      carbs: totals.carbs + item.ingredient.carbsPer100g * share,
      fat: totals.fat + item.ingredient.fatPer100g * share,
    };
  }, zero);
}
