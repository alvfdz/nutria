import type { MacroBudget, SlotBudget } from "@/lib/goals/budget";
import type { MealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";

/**
 * A stored calendar entry: one meal template planned into one of a day's meal
 * slots. The plan freezes nothing else — slot names, order, shares and macro
 * targets are always read from the current goals when a view is built.
 */
export type PlannedMeal = {
  /** Identifier of the plan row, used to remove it again. */
  id: string;
  /** The day it belongs to, `YYYY-MM-DD`. */
  date: string;
  /** The Goals slot it fills. */
  mealSlotId: string;
  /** The planned template. */
  mealId: string;
  /** Position within its slot, preserving the order meals were added in. */
  sortOrder: number;
  /** The template itself, items and ingredients embedded. */
  meal: Meal;
};

/** The fields needed to plan a meal: what, where, and when. */
export type NewPlannedMeal = {
  /** The day to plan on, `YYYY-MM-DD`. */
  date: string;
  /** The Goals slot to fill. */
  mealSlotId: string;
  /** The template to plan. */
  mealId: string;
};

/**
 * One planned meal as a slot card renders it: the label and the live totals
 * computed from the template's current ingredients.
 */
export type PlannedMealView = {
  /** Identifier of the plan row, used to remove it again. */
  id: string;
  /** Identifier of the template, used to count copies within a slot. */
  mealId: string;
  /** Display name of the template. */
  name: string;
  /** The template's macros, computed from the current ingredient values. */
  totals: MealTotals;
  /** The meal's ingredients, in the order the template stores them. */
  items: PlannedMealItemView[];
};

/** One ingredient of a planned meal, as the panel's expanded row renders it. */
export type PlannedMealItemView = {
  /** Identifier of the stored meal item. */
  id: string;
  /** Display name of the ingredient. */
  name: string;
  /** Quantity used, in grams. */
  grams: number;
  /** The calories this quantity contributes. */
  calories: number;
};

/** One meal slot of one day, with its current plan and computed guidance. */
export type SlotView = {
  /** Identifier of the Goals slot. */
  id: string;
  /** Slot name from the current Goals, e.g. "Breakfast". */
  name: string;
  /**
   * Share of the day's budget, 0–100, from the current Goals. Kept for the
   * goals form, which still thinks in shares; the board no longer reads it.
   */
  percent: number;
  /** The slot's target budget, derived from the current Goals. */
  target: SlotBudget;
  /** The templates planned into this slot, in the order they were added. */
  meals: PlannedMealView[];
  /** The sum of the planned meals' macros; zeroes when nothing is planned. */
  totals: MealTotals;
};

/**
 * One day of the week as the board renders it, serializable so the server page
 * can hand it to the client board. Everything derived from the current goals
 * is resolved here, at render time.
 */
export type DayColumn = {
  /** The day's date key, `YYYY-MM-DD`. */
  date: string;
  /** Short weekday name, e.g. `Mon`. */
  weekday: string;
  /** Day of the month as a bare number string, e.g. `13`. */
  dayOfMonth: string;
  /** Whether this column is today. */
  isToday: boolean;
  /** Whether the day can be planned; days before today are read-only. */
  isEditable: boolean;
  /** The day's target budget, or null when no goals are set. */
  budget: MacroBudget | null;
  /** The sum of every planned meal that day. */
  planned: MealTotals;
  /** One slot per Goals slot, in dining order. */
  slots: SlotView[];
};
