import type { NewMealSlot } from "./types";

/** Protein, carbohydrate and fat yields per gram, in kilocalories. */
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** The fields of a daily budget the macro math needs. */
type BudgetSource = {
  /** Total daily energy target in kilocalories. */
  calories: number;
  /** Share of daily energy coming from protein, 0–100. */
  proteinPct: number;
  /** Share of daily energy coming from carbohydrates, 0–100. */
  carbsPct: number;
  /** Share of daily energy coming from fat, 0–100. */
  fatPct: number;
};

/** The daily budget in grams, derived from the calorie target and macro split. */
export type MacroBudget = {
  /** Total daily energy target in kilocalories. */
  calories: number;
  /** Protein grams per day. */
  proteinGrams: number;
  /** Carbohydrate grams per day. */
  carbsGrams: number;
  /** Fat grams per day. */
  fatGrams: number;
};

/** One meal's slice of the daily budget: kcal and grams per macro. */
export type SlotBudget = MacroBudget;

/**
 * Turns a day's calorie target and macro percentages into gram targets using
 * the 4/4/9 rule (protein and carbs ~4 kcal/g, fat ~9 kcal/g). Pure math with
 * no I/O, so the server action and the client form's live summary share it.
 *
 * @param source The calorie target and the three macro shares.
 * @returns The daily budget with gram targets per macro.
 */
export function computeMacroBudget(source: BudgetSource): MacroBudget {
  return {
    calories: source.calories,
    proteinGrams:
      (source.calories * source.proteinPct) / 100 / KCAL_PER_GRAM.protein,
    carbsGrams: (source.calories * source.carbsPct) / 100 / KCAL_PER_GRAM.carbs,
    fatGrams: (source.calories * source.fatPct) / 100 / KCAL_PER_GRAM.fat,
  };
}

/**
 * Computes one meal's slice of the daily budget: the daily grams scaled by
 * the meal's percentage share of the total budget.
 *
 * @param source The calorie target and macro shares of the day.
 * @param percent The meal's share of the daily budget, 0–100.
 * @returns The meal's kcal and gram targets.
 */
export function computeSlotBudget(
  source: BudgetSource,
  percent: number,
): SlotBudget {
  const daily = computeMacroBudget(source);
  const share = percent / 100;

  return {
    calories: daily.calories * share,
    proteinGrams: daily.proteinGrams * share,
    carbsGrams: daily.carbsGrams * share,
    fatGrams: daily.fatGrams * share,
  };
}

/**
 * Computes every meal's slice of the daily budget, one per slot. Pure math so
 * the form's live summary can show a per-meal breakdown while editing.
 *
 * @param source The calorie target and macro shares of the day.
 * @param slots The day's meals, each carrying its share of the budget.
 * @returns One budget per slot, in the order the slots were given.
 */
export function computeSlotBudgets(
  source: BudgetSource,
  slots: Pick<NewMealSlot, "percent">[],
): SlotBudget[] {
  return slots.map((slot) => computeSlotBudget(source, slot.percent));
}
