import { formatWhole } from "@/lib/goals/display";
import { computeMealTotals, type MealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";
import type { PlannedMealView } from "@/lib/plan/types";

/**
 * How far a macro may miss its target and still count as met, as a fraction of
 * the target (5%). Wide enough for honest rounding while still flagging a meal
 * that is genuinely short or over.
 */
export const MACRO_TOLERANCE = 0.05;

/** The three macronutrients the food panel's guidance bars report on. */
export type MacroKey = "protein" | "carbs" | "fat";

/**
 * How a planned macro amount stands against its target:
 *
 * - `met` — within the tolerance band on either side of the target;
 * - `short` — below the target by more than the tolerance;
 * - `over` — above the target by more than the tolerance.
 */
export type MacroState = "met" | "short" | "over";

/** Human labels for the macro keys, used in accessible state strings. */
const MACRO_LABELS: Record<MacroKey, string> = {
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

/** A zeroed total, shared as the fold's starting value. */
const ZERO_TOTALS: MealTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

/**
 * Sums several macro totals into one, e.g. a slot's meals or a day's slots.
 *
 * @param list The totals to add together.
 * @returns One total holding the sum of every field; zeroes for an empty list.
 */
export function sumTotals(list: MealTotals[]): MealTotals {
  return list.reduce<MealTotals>(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      protein: totals.protein + entry.protein,
      carbs: totals.carbs + entry.carbs,
      fat: totals.fat + entry.fat,
    }),
    ZERO_TOTALS,
  );
}

/**
 * Totals every meal planned into one slot, against their current ingredients.
 *
 * @param meals The planned meals, each carrying its items.
 * @returns The slot's summed macros; zeroes when nothing is planned.
 */
export function slotTotals(meals: Pick<Meal, "items">[]): MealTotals {
  return sumTotals(meals.map((meal) => computeMealTotals(meal)));
}

/**
 * Totals every meal planned across a day's slots.
 *
 * @param slots The day's slots, each carrying its planned meals.
 * @returns The day's summed macros; zeroes when nothing is planned.
 */
export function dayTotals(
  slots: { meals: Pick<Meal, "items">[] }[],
): MealTotals {
  return slotTotals(slots.flatMap((slot) => slot.meals));
}

/**
 * Classifies a planned macro amount against its target.
 *
 * The calendar shows whole numbers, so a plan that rounds to the same number as
 * its target is `met`; otherwise the marker would read `−0` or `+0`. Past that,
 * a target of zero is a special case: any plan is `over`. Otherwise the plan is
 * `met` while its distance from the target stays within {@link MACRO_TOLERANCE}
 * of the target, and `short` or `over` beyond that.
 *
 * @param planned The macro amount the planned meals deliver.
 * @param target The macro amount the goal asks for.
 * @returns The state plus the signed gap (`planned - target`).
 */
export function macroState(
  planned: number,
  target: number,
): { state: MacroState; delta: number } {
  const delta = planned - target;

  if (Math.round(planned) === Math.round(target)) {
    return { state: "met", delta };
  }

  if (target === 0) {
    return { state: "over", delta };
  }

  if (Math.abs(delta) <= MACRO_TOLERANCE * target) {
    return { state: "met", delta };
  }

  return { state: delta < 0 ? "short" : "over", delta };
}

/**
 * The gap between a plan and its target as the whole numbers the calendar
 * shows, so the gap always matches the two values beside it.
 *
 * @param planned The amount the plan delivers.
 * @param target The amount the goal asks for.
 * @returns The rounded plan minus the rounded target.
 */
function wholeGap(planned: number, target: number): number {
  return Math.round(planned) - Math.round(target);
}

/**
 * A plan's short state marker. The glyph carries the state in text form, so it
 * is never colour-only: a tick when met, the signed gap otherwise.
 *
 * @param planned The amount the plan delivers.
 * @param target The amount the goal asks for.
 * @returns `✓`, `−n` or `+n`.
 */
export function stateMarker(planned: number, target: number): string {
  const { state } = macroState(planned, target);

  if (state === "met") return "✓";

  const gap = wholeGap(planned, target);

  return gap < 0 ? `−${Math.abs(gap)}` : `+${gap}`;
}

/**
 * Spells a macro's state out in words for screen readers, so the guidance is
 * never carried by colour or a glyph alone.
 *
 * @param state The classification from {@link macroState}.
 * @param macro Which macronutrient the bar reports on.
 * @param planned The planned amount, in grams.
 * @param target The target amount, in grams.
 * @returns A string such as `Protein: 47 of 62 g, 15 g short`.
 */
export function stateLabel(
  state: MacroState,
  macro: MacroKey,
  planned: number,
  target: number,
): string {
  const name = MACRO_LABELS[macro];
  const amount = `${formatWhole(planned)} of ${formatWhole(target)} g`;
  const gap = Math.abs(wholeGap(planned, target));

  if (state === "short") {
    return `${name}: ${amount}, ${gap} g short`;
  }

  if (state === "over") {
    return `${name}: ${amount}, ${gap} g over`;
  }

  return `${name}: ${amount}, on target`;
}

/**
 * The geometry of one macro bar: how much of the row the plan fills.
 *
 * The row is scaled to the larger of the plan and the target, so the fill
 * reaches the end of the track exactly when the plan meets or exceeds its
 * target and stops short otherwise. A zero scale draws no fill.
 *
 * @param planned The macro amount the planned meals deliver.
 * @param target The macro amount the goal asks for.
 * @returns The fill width as a percentage.
 */
export function barGeometry(
  planned: number,
  target: number,
): { fillPercent: number } {
  const max = Math.max(planned, target);

  return { fillPercent: max === 0 ? 0 : (planned / max) * 100 };
}

/**
 * Whether a planned amount counts as over its target, and the sentence that
 * spells it out. Uses the same tolerance as the macro guidance, so the card's
 * over marker and the bars agree on what "over" means.
 *
 * @param planned The amount the plan delivers.
 * @param target The amount the goal asks for.
 * @returns A sentence such as `60 kcal over target`, or `null` when the plan
 *   is within tolerance or short.
 */
export function overLabel(planned: number, target: number): string | null {
  const { state } = macroState(planned, target);

  return state === "over"
    ? `${wholeGap(planned, target)} kcal over target`
    : null;
}

/**
 * Spells a day's calories against its target in words, for the screen-reader
 * twin of the day header's marker.
 *
 * @param planned The kcal the day's plan delivers.
 * @param target The day's kcal target.
 * @returns `On target`, `500 kcal short of target` or `60 kcal over target`.
 */
export function calorieStateLabel(planned: number, target: number): string {
  const { state } = macroState(planned, target);

  if (state === "met") return "On target";

  const gap = wholeGap(planned, target);

  return gap < 0
    ? `${Math.abs(gap)} kcal short of target`
    : `${gap} kcal over target`;
}

/** Copies of one meal template planned into a slot, folded into one row. */
export type PlannedMealGroup = {
  /** Identifier of the meal template. */
  mealId: string;
  /** Display name of the meal template. */
  name: string;
  /** How many copies sit in the slot. */
  count: number;
  /** The kcal of all the copies together. */
  calories: number;
};

/**
 * Folds a slot's planned meals into one row per template, in first-planned
 * order, so three servings of one meal read as `×3` rather than three rows.
 *
 * @param meals The slot's planned meals.
 * @returns One group per distinct template; empty for an empty slot.
 */
export function groupPlannedMeals(
  meals: Pick<PlannedMealView, "mealId" | "name" | "totals">[],
): PlannedMealGroup[] {
  const groups = new Map<string, PlannedMealGroup>();

  for (const meal of meals) {
    const group = groups.get(meal.mealId);

    if (group) {
      group.count += 1;
      group.calories += meal.totals.calories;
    } else {
      groups.set(meal.mealId, {
        mealId: meal.mealId,
        name: meal.name,
        count: 1,
        calories: meal.totals.calories,
      });
    }
  }

  return [...groups.values()];
}
