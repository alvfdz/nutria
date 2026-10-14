import { formatMacro } from "@/lib/ingredients/format";
import { computeMealTotals, type MealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";

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
 * A target of zero is a special case: any plan is `over`, an empty plan is
 * `met`. Otherwise the plan is `met` while its distance from the target stays
 * within {@link MACRO_TOLERANCE} of the target, and `short` or `over` beyond
 * that.
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

  if (target === 0) {
    return { state: planned > 0 ? "over" : "met", delta };
  }

  if (Math.abs(delta) <= MACRO_TOLERANCE * target) {
    return { state: "met", delta };
  }

  return { state: delta < 0 ? "short" : "over", delta };
}

/**
 * Spells a macro's state out in words for screen readers, so the guidance is
 * never carried by colour or a glyph alone.
 *
 * @param state The classification from {@link macroState}.
 * @param macro Which macronutrient the bar reports on.
 * @param planned The planned amount, in grams.
 * @param target The target amount, in grams.
 * @returns A string such as `Protein: 46.8 of 62 g, 15.2 g short`.
 */
export function stateLabel(
  state: MacroState,
  macro: MacroKey,
  planned: number,
  target: number,
): string {
  const name = MACRO_LABELS[macro];
  const amount = `${formatMacro(planned)} of ${formatMacro(target)} g`;

  if (state === "short") {
    return `${name}: ${amount}, ${formatMacro(target - planned)} g short`;
  }

  if (state === "over") {
    return `${name}: ${amount}, ${formatMacro(planned - target)} g over`;
  }

  return `${name}: ${amount}, on target`;
}

/**
 * The geometry of one macro bar: how much of the row the plan fills, and
 * where the target sits on that same scale.
 *
 * The row is scaled to the larger of the plan and the target, so an overshoot
 * visibly passes its target tick while a shortfall stops before it. A zero
 * scale draws no fill, and a zero target draws no tick.
 *
 * @param planned The macro amount the planned meals deliver.
 * @param target The macro amount the goal asks for.
 * @returns The fill width as a percentage, and the tick position, or `null`
 *   when no tick should be drawn.
 */
export function barGeometry(
  planned: number,
  target: number,
): { fillPercent: number; tickPercent: number | null } {
  const max = Math.max(planned, target);

  return {
    fillPercent: max === 0 ? 0 : (planned / max) * 100,
    tickPercent: max === 0 || target === 0 ? null : (target / max) * 100,
  };
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
    ? `${formatMacro(planned - target)} kcal over target`
    : null;
}
