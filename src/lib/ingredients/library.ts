import { KCAL_PER_GRAM } from "@/lib/goals/budget";

import type { Ingredient } from "./types";

/** A library column the table can sort by. */
export type SortKey =
  "name" | "caloriesPer100g" | "proteinPer100g" | "carbsPer100g" | "fatPer100g";

/** The library's sort: a column and direction, or `null` for newest first. */
export type LibrarySort = {
  /** The column being sorted. */
  key: SortKey;
  /** The direction of the sort. */
  direction: "asc" | "desc";
} | null;

/** Which meals use each ingredient: meal names by ingredient id. */
export type IngredientUsage = Record<string, string[]>;

/** How many meals {@link formatMealList} names before summarizing the rest. */
const MAX_NAMED_MEALS = 3;

/**
 * Prepares text for matching: case and accents are ignored, so `jamon` finds
 * `Jamón`.
 *
 * @param text The text to normalize.
 * @returns The trimmed, lowercase text without diacritics.
 */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

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
  const needle = normalize(query);
  if (!needle) return ingredients;

  return ingredients.filter((ingredient) =>
    normalize(ingredient.name).includes(needle),
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
  sort: LibrarySort,
): Ingredient[] {
  if (!sort) return ingredients;

  const { key, direction } = sort;
  const sign = direction === "asc" ? 1 : -1;
  const byName = (a: Ingredient, b: Ingredient) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

  return [...ingredients].sort((a, b) => {
    if (key === "name") return sign * byName(a, b);

    return sign * (a[key] - b[key]) || byName(a, b);
  });
}

/**
 * The sort after a column heading is clicked. Each column cycles through its
 * natural direction, the opposite one, and back to newest first. Names start
 * A to Z; numbers start highest first, the usual question being "what has the
 * most protein?".
 *
 * @param current The current sort.
 * @param key The column that was clicked.
 * @returns The next sort.
 */
export function nextSort(current: LibrarySort, key: SortKey): LibrarySort {
  const first = key === "name" ? "asc" : "desc";

  if (current?.key !== key) return { key, direction: first };
  if (current.direction === first) {
    return { key, direction: first === "asc" ? "desc" : "asc" };
  }

  return null;
}

/**
 * Each macro's share of the calories its grams provide. The shares come from
 * the macros rather than the stated calories, so they always total 100.
 *
 * @param ingredient The ingredient's macros per 100 g.
 * @returns The percentages, or `null` when it has no macros to compare, as with
 * water or salt.
 */
export function macroCalorieShares(
  ingredient: Pick<
    Ingredient,
    "proteinPer100g" | "carbsPer100g" | "fatPer100g"
  >,
): { proteinPct: number; carbsPct: number; fatPct: number } | null {
  const protein = ingredient.proteinPer100g * KCAL_PER_GRAM.protein;
  const carbs = ingredient.carbsPer100g * KCAL_PER_GRAM.carbs;
  const fat = ingredient.fatPer100g * KCAL_PER_GRAM.fat;
  const total = protein + carbs + fat;

  if (total <= 0) return null;

  return {
    proteinPct: (protein / total) * 100,
    carbsPct: (carbs / total) * 100,
    fatPct: (fat / total) * 100,
  };
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
