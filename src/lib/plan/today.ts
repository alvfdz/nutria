import type { MealTotals } from "@/lib/meals/macros";
import { sumTotals } from "./rollup";
import type { DayColumn } from "./types";

/** Where a day stands: what has been eaten and what the plan still holds. */
export type DaySummary = {
  /** The sum of every ticked meal. */
  eaten: MealTotals;
  /** The sum of every planned meal not ticked yet. */
  stillPlanned: MealTotals;
  /** The daily kcal target; zero when the day has no budget. */
  targetCalories: number;
  /** Target minus eaten kcal, rounded; negative once over budget. */
  caloriesLeft: number;
};

/** How much of the budget bar each zone fills, as percentages of its width. */
export type BudgetBarGeometry = {
  /** Width of the solid eaten zone. */
  eatenPercent: number;
  /** Width of the faint still-planned zone. */
  plannedPercent: number;
};

/**
 * Sums a day into eaten and still-planned meals. Only ticked meals reduce what
 * is left: a planned meal hasn't been eaten yet.
 *
 * @param day The day to summarize.
 * @returns The day's {@link DaySummary}.
 */
export function summarizeDay(day: DayColumn): DaySummary {
  const meals = day.slots.flatMap((slot) => slot.meals);
  const eaten = sumTotals(
    meals.filter((meal) => meal.eaten).map((meal) => meal.totals),
  );
  const stillPlanned = sumTotals(
    meals.filter((meal) => !meal.eaten).map((meal) => meal.totals),
  );
  const targetCalories = day.budget?.calories ?? 0;

  return {
    eaten,
    stillPlanned,
    targetCalories,
    caloriesLeft: Math.round(targetCalories - eaten.calories),
  };
}

/**
 * The geometry of the three-zone budget bar. The track is scaled to the larger
 * of the target and everything on the day, so an overshoot fills the whole bar
 * and the zones keep their proportions. A zero scale draws no fill.
 *
 * @param eaten Kcal eaten.
 * @param stillPlanned Kcal still planned.
 * @param target The daily kcal target.
 * @returns The width of the eaten and still-planned zones.
 */
export function budgetBarGeometry(
  eaten: number,
  stillPlanned: number,
  target: number,
): BudgetBarGeometry {
  const scale = Math.max(target, eaten + stillPlanned);

  if (scale <= 0) return { eatenPercent: 0, plannedPercent: 0 };

  return {
    eatenPercent: (eaten / scale) * 100,
    plannedPercent: (stillPlanned / scale) * 100,
  };
}

/**
 * Returns a copy of a day with one meal's tick changed, so a tick can show
 * before the server has confirmed it.
 *
 * @param day The day to copy.
 * @param planMealId The plan row to change.
 * @param eaten The row's new state.
 * @returns The new day; an unknown id leaves every meal as it was.
 */
export function withMealEaten(
  day: DayColumn,
  planMealId: string,
  eaten: boolean,
): DayColumn {
  return {
    ...day,
    slots: day.slots.map((slot) => ({
      ...slot,
      meals: slot.meals.map((meal) =>
        meal.id === planMealId ? { ...meal, eaten } : meal,
      ),
    })),
  };
}
