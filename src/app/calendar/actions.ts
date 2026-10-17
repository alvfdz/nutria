"use server";

import { refresh } from "next/cache";

import { dbDateFromKey, todayKey } from "@/lib/calendar/week";
import type { AssignMealState, RemoveMealState } from "@/lib/plan/form-state";
import {
  assignMeal,
  getPlannedMeal,
  removePlannedMeal,
} from "@/lib/plan/repository";
import {
  parseAssignMealFormData,
  parseRemoveMealFormData,
} from "@/lib/plan/schema";

/** Message shown when a plan is edited on a day that has already passed. */
const PAST_DAY_MESSAGE =
  "That day has passed. Plans can only be changed for today or later.";

/**
 * Server action behind the assign dialog. Validates the submission, refuses a
 * day before today, plans the template, and refreshes the route so the slot
 * re-renders with the new meal.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission of the assign dialog.
 * @returns An error state with a form message, or a success state carrying the
 * planned meal's name to announce.
 */
export async function assignMealAction(
  previousState: AssignMealState,
  formData: FormData,
): Promise<AssignMealState> {
  const result = parseAssignMealFormData(formData);

  if (!result.success) {
    return {
      ...previousState,
      status: "error",
      formError:
        result.error.issues[0]?.message ?? "The meal could not be added.",
    };
  }

  const { date, mealSlotId, mealId } = result.data;

  // Defense in depth: the board hides its controls on past days, but the
  // action refuses them on its own too.
  if (date < todayKey()) {
    return { ...previousState, status: "error", formError: PAST_DAY_MESSAGE };
  }

  const mealName = formData.get("mealName");

  try {
    await assignMeal(dbDateFromKey(date), mealSlotId, mealId);
    refresh();

    return {
      status: "success",
      assignedName: typeof mealName === "string" ? mealName : "",
    };
  } catch (error) {
    console.error("Could not add the meal to the plan", error);

    return {
      ...previousState,
      status: "error",
      formError: "The meal could not be added. Please try again.",
    };
  }
}

/**
 * Server action behind a slot card's remove button. Validates the id, refuses
 * a plan on a day before today, removes it, and refreshes the route.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission of the remove form.
 * @returns An error state with a form message, or a success state carrying the
 * removed meal's name to announce.
 */
export async function removeMealAction(
  previousState: RemoveMealState,
  formData: FormData,
): Promise<RemoveMealState> {
  const result = parseRemoveMealFormData(formData);

  if (!result.success) {
    return {
      ...previousState,
      status: "error",
      formError:
        result.error.issues[0]?.message ?? "The meal could not be removed.",
    };
  }

  try {
    const plan = await getPlannedMeal(result.data.planMealId);

    if (!plan) {
      return {
        ...previousState,
        status: "error",
        formError: "That planned meal no longer exists. Reload the page.",
      };
    }

    if (plan.date < todayKey()) {
      return { ...previousState, status: "error", formError: PAST_DAY_MESSAGE };
    }

    await removePlannedMeal(plan.id);
    refresh();

    return { status: "success", removedName: plan.meal.name };
  } catch (error) {
    console.error("Could not remove the meal from the plan", error);

    return {
      ...previousState,
      status: "error",
      formError: "The meal could not be removed. Please try again.",
    };
  }
}
