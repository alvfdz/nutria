import { THIN_SPACE } from "@/lib/design-system";
import { formatMacro } from "@/lib/ingredients/format";
import {
  compareNames,
  normalizeSearchText,
  type LibrarySort,
} from "@/lib/library";

import { computeMealTotals, type MealTotals } from "./macros";
import type { Meal } from "./types";

/** A meal library column the table can sort by. */
export type MealSortKey = "name" | keyof MealTotals;

/**
 * Keeps the meals whose name, or the name of an ingredient they list, contains
 * the query. Each row shows its ingredients, so they are searched too.
 *
 * @param meals The library, in display order.
 * @param query What the user typed; blank keeps everything.
 * @returns The matches, in their original order.
 */
export function filterMeals(meals: Meal[], query: string): Meal[] {
  const needle = normalizeSearchText(query);
  if (!needle) return meals;

  return meals.filter((meal) =>
    [meal.name, ...meal.items.map((item) => item.ingredient.name)].some(
      (name) => normalizeSearchText(name).includes(needle),
    ),
  );
}

/**
 * Orders the meals by a column, breaking ties by name so the order is stable as
 * values repeat. Does not change the array it is given.
 *
 * @param meals The meals, newest first.
 * @param sort The sort to apply; `null` keeps the given order.
 * @returns The ordered meals.
 */
export function sortMeals(
  meals: Meal[],
  sort: LibrarySort<MealSortKey>,
): Meal[] {
  if (!sort) return meals;

  const { key, direction } = sort;
  const sign = direction === "asc" ? 1 : -1;

  if (key === "name") {
    return [...meals].sort((a, b) => sign * compareNames(a.name, b.name));
  }

  return meals
    .map((meal) => ({ meal, value: computeMealTotals(meal)[key] }))
    .sort(
      (a, b) =>
        sign * (a.value - b.value) || compareNames(a.meal.name, b.meal.name),
    )
    .map(({ meal }) => meal);
}

/**
 * Lists what a meal is made of, in builder order: `Oats (100 g), Milk (200 g)`.
 *
 * @param meal The meal to describe.
 * @returns The list as text; empty for a meal with no items.
 */
export function formatMealItems(meal: Pick<Meal, "items">): string {
  return meal.items
    .map(
      (item) =>
        `${item.ingredient.name} (${formatMacro(item.grams)}${THIN_SPACE}g)`,
    )
    .join(", ");
}
