"use client";

import { useActionState, useEffect } from "react";

import { swapMealAction } from "@/app/(app)/actions";
import { MealPicker } from "@/components/meal-picker";
import type { Meal } from "@/lib/meals/types";
import { initialSwapMealState } from "@/lib/plan/form-state";
import type { PlannedMealView, SlotView } from "@/lib/plan/types";

/**
 * The picker for replacing a planned meal with another template. The meal being
 * replaced isn't offered, and its kcal count as free again, so "over by" reads
 * what the slot would hold after the swap.
 *
 * @param props.slot The slot holding the meal.
 * @param props.meal The planned meal being replaced.
 * @param props.meals The whole meal library to choose from.
 * @param props.onSwapped Called with the new meal's name on success.
 */
export function SwapMealPicker({
  slot,
  meal,
  meals,
  onSwapped,
}: {
  slot: SlotView;
  meal: PlannedMealView;
  meals: Meal[];
  onSwapped: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    swapMealAction,
    initialSwapMealState,
  );

  useEffect(() => {
    if (state.status !== "success" || state.swappedName === undefined) return;

    onSwapped(state.swappedName);
  }, [state, onSwapped]);

  return (
    <MealPicker
      meals={meals.filter((candidate) => candidate.id !== meal.mealId)}
      remainingCalories={
        slot.target.calories - slot.totals.calories + meal.totals.calories
      }
      formAction={formAction}
      pending={pending}
      formError={state.formError}
      emptyTitle="No other meals to swap to"
      rowLabel={(candidate) => `Swap to ${candidate.name}`}
      fields={(candidate) => ({
        planMealId: meal.id,
        mealId: candidate.id,
        mealName: candidate.name,
      })}
    />
  );
}
