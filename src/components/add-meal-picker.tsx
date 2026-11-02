"use client";

import { useActionState, useEffect, useMemo } from "react";

import { assignMealAction } from "@/app/(app)/calendar/actions";
import { MealPicker } from "@/components/meal-picker";
import type { Meal } from "@/lib/meals/types";
import { initialAssignMealState } from "@/lib/plan/form-state";
import type { SlotView } from "@/lib/plan/types";

/**
 * The picker for adding a meal template to a slot. Templates already planned in
 * the slot are marked with how many copies sit there, but stay addable — a slot
 * often takes two or three servings of the same template. A successful add
 * keeps the picker open.
 *
 * @param props.date The day's key, `YYYY-MM-DD`.
 * @param props.slot The slot being filled.
 * @param props.meals The whole meal library to choose from.
 * @param props.onAssigned Called with the planned meal's name on success.
 */
export function AddMealPicker({
  date,
  slot,
  meals,
  onAssigned,
}: {
  date: string;
  slot: SlotView;
  meals: Meal[];
  onAssigned: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    assignMealAction,
    initialAssignMealState,
  );

  const plannedCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const meal of slot.meals) {
      counts.set(meal.mealId, (counts.get(meal.mealId) ?? 0) + 1);
    }

    return counts;
  }, [slot.meals]);

  useEffect(() => {
    if (state.status !== "success" || state.assignedName === undefined) return;

    onAssigned(state.assignedName);
  }, [state, onAssigned]);

  return (
    <MealPicker
      meals={meals}
      remainingCalories={slot.target.calories - slot.totals.calories}
      formAction={formAction}
      pending={pending}
      formError={state.formError}
      plannedCounts={plannedCounts}
      rowLabel={(meal) => `Add ${meal.name}`}
      fields={(meal) => ({
        date,
        mealSlotId: slot.id,
        mealId: meal.id,
        mealName: meal.name,
      })}
    />
  );
}
