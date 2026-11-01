import {
  compareNames,
  normalizeSearchText,
  type LibrarySort,
} from "@/lib/library";

import type { Ingredient } from "./types";

/** A library column the table can sort by. */
export type SortKey =
  "name" | "caloriesPer100g" | "proteinPer100g" | "carbsPer100g" | "fatPer100g";

/** Which meals use each ingredient: meal names by ingredient id. */
export type IngredientUsage = Record<string, string[]>;

/** How many meals {@link formatMealList} names before summarizing the rest. */
const MAX_NAMED_MEALS = 3;

/**
 * Keeps the ingredients whose name contains the query.
 *
 * @param ingredients The library, in display order.
 * @param query What the user typed; blank keeps everything.
 * @returns The matches, in their original order.
 */
export function filterIngredients(
  ingredients: Ingredient[],
  query: string,
): Ingredient[] {
  const needle = normalizeSearchText(query);
  if (!needle) return ingredients;

  return ingredients.filter((ingredient) =>
    normalizeSearchText(ingredient.name).includes(needle),
  );
}

/**
 * Orders the ingredients by a column, breaking ties by name so the order is
 * stable as values repeat. Does not change the array it is given.
 *
 * @param ingredients The ingredients, newest first.
 * @param sort The sort to apply; `null` keeps the given order.
 * @returns The ordered ingredients.
 */
export function sortIngredients(
  ingredients: Ingredient[],
  sort: LibrarySort<SortKey>,
): Ingredient[] {
  if (!sort) return ingredients;

  const { key, direction } = sort;
  const sign = direction === "asc" ? 1 : -1;
  const byName = (a: Ingredient, b: Ingredient) => compareNames(a.name, b.name);

  return [...ingredients].sort((a, b) => {
    if (key === "name") return sign * byName(a, b);

    return sign * (a[key] - b[key]) || byName(a, b);
  });
}

/**
 * Names meals in a sentence, summarizing long lists: `Porridge, Granola, Stew
 * and 2 more`.
 *
 * @param meals The meal names; expected not to be empty.
 * @returns The list as text.
 */
export function formatMealList(meals: string[]): string {
  if (meals.length > MAX_NAMED_MEALS) {
    const named = meals.slice(0, MAX_NAMED_MEALS).join(", ");
    return `${named} and ${meals.length - MAX_NAMED_MEALS} more`;
  }
  if (meals.length <= 1) return meals[0] ?? "";

  return `${meals.slice(0, -1).join(", ")} and ${meals[meals.length - 1]}`;
}
