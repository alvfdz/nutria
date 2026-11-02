import { dayOfMonth, weekDays, weekdayShort } from "@/lib/calendar/week";
import { computeMacroBudget, computeSlotBudgets } from "@/lib/goals/budget";
import type { Goals } from "@/lib/goals/types";
import { computeMealTotals, itemCalories } from "@/lib/meals/macros";
import { sumTotals } from "./rollup";
import type { DayColumn, PlannedMeal, SlotView } from "./types";

/**
 * Builds one day's view from the user's current goals and plan rows. Slot
 * names, order, shares and targets all come from the goals at render time; the
 * plan only says which meals sit where.
 *
 * @param goals The stored daily goals, slots in dining order.
 * @param plans Plan rows; those of other days are ignored.
 * @param date The day to build, `YYYY-MM-DD`.
 * @param today Today's key, used to mark the day and gate its controls.
 * @returns The day's {@link DayColumn}.
 */
export function buildDay(
  goals: Goals,
  plans: PlannedMeal[],
  date: string,
  today: string,
): DayColumn {
  const slotBudgets = computeSlotBudgets(goals, goals.slots);

  const slots: SlotView[] = goals.slots.map((slot, index) => {
    const meals = plans
      .filter((plan) => plan.date === date && plan.mealSlotId === slot.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((plan) => ({
        id: plan.id,
        mealId: plan.meal.id,
        name: plan.meal.name,
        eaten: plan.eaten,
        totals: computeMealTotals(plan.meal),
        items: plan.meal.items.map((item) => ({
          id: item.id,
          name: item.ingredient.name,
          grams: item.grams,
          calories: itemCalories(item),
        })),
      }));

    return {
      id: slot.id,
      name: slot.name,
      percent: slot.percent,
      target: slotBudgets[index],
      meals,
      totals: sumTotals(meals.map((meal) => meal.totals)),
    };
  });

  return {
    date,
    weekday: weekdayShort(date),
    dayOfMonth: dayOfMonth(date),
    isToday: date === today,
    isEditable: date >= today,
    budget: computeMacroBudget(goals),
    planned: sumTotals(slots.map((slot) => slot.totals)),
    slots,
  };
}

/**
 * Builds the seven board columns of a week.
 *
 * @param goals The stored daily goals, slots in dining order.
 * @param plans Every plan row in the shown week.
 * @param weekStart The shown week's Monday.
 * @param today Today's key, used to mark the column and gate the controls.
 * @returns One {@link DayColumn} per day, Monday → Sunday.
 */
export function buildDays(
  goals: Goals,
  plans: PlannedMeal[],
  weekStart: string,
  today: string,
): DayColumn[] {
  return weekDays(weekStart).map((date) => buildDay(goals, plans, date, today));
}
