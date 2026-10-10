import type { Ingredient } from "@/lib/ingredients/types";

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
 * The minimum an item needs to contribute to a meal's totals: a quantity and
 * the ingredient it points at. Stored meal items satisfy this, and so do the
 * in-progress rows of the meal builder before they are saved.
 */
export type TotalsItem = {
  /** Quantity of the ingredient the meal uses, in grams. */
  grams: number;
  /** The referenced ingredient, supplying the per-100 g densities. */
  ingredient: Ingredient;
};

/**
 * Sums macros from a list of items: each ingredient's density per 100 g is
 * scaled by the quantity used (`per100g × grams / 100`).
 *
 * @param items The items to total; assumes each has a real ingredient and a
 *   grams value, so callers filter out incomplete rows first.
 * @returns The sums for the whole list; zeroes for an empty list.
 */
export function sumMealItems(items: TotalsItem[]): MealTotals {
  const zero: MealTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return items.reduce<MealTotals>((totals, item) => {
    const share = item.grams / 100;

    return {
      calories: totals.calories + item.ingredient.caloriesPer100g * share,
      protein: totals.protein + item.ingredient.proteinPer100g * share,
      carbs: totals.carbs + item.ingredient.carbsPer100g * share,
      fat: totals.fat + item.ingredient.fatPer100g * share,
    };
  }, zero);
}

/**
 * Sums a meal's macros from its items. Totals are computed live rather than
 * snapshotted, so editing an ingredient's macros updates every meal it belongs
 * to.
 *
 * @param meal The meal (or any object carrying `items`) to total.
 * @returns The sums for the whole meal; zeroes for a meal with no items.
 */
export function computeMealTotals(meal: Pick<Meal, "items">): MealTotals {
  return sumMealItems(meal.items);
}
