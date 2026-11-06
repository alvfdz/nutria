"use server";

import { refresh } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { todayKey } from "@/lib/calendar/week";
import { PlanTargetNotFoundError } from "@/lib/plan/errors";
import { markTutorialSeen } from "@/lib/tutorial/repository";
import type { SetMealEatenState, SwapMealState } from "@/lib/plan/form-state";
import {
  getPlannedMeal,
  setPlanMealEaten,
  swapPlannedMeal,
} from "@/lib/plan/repository";
import {
  parseSetMealEatenFormData,
  parseSwapMealFormData,
} from "@/lib/plan/schema";

/** Message shown when a plan row has vanished, e.g. removed in another tab. */
const MISSING_PLAN_MESSAGE =
  "That planned meal no longer exists. Reload the page.";

/**
 * Server action behind a tick on the Today page. Requires a signed-in user,
 * validates the submission, accepts today's meals only (a future meal can't be
 * eaten yet, and past days are locked), saves the tick and refreshes the route.
 *
 * @param previousState State returned by the previous submit.
 * @param formData The plan row's `planMealId` and its new `eaten` state.
 * @returns An error state with a message, or a success state.
 */
export async function setMealEatenAction(
  previousState: SetMealEatenState,
  formData: FormData,
): Promise<SetMealEatenState> {
  const user = await requireUser();
  const result = parseSetMealEatenFormData(formData);

  if (!result.success) {
    return {
      ...previousState,
      status: "error",
      // A failed parse always carries at least one issue; the fallback only
      // satisfies the index type.
      formError:
        /* v8 ignore next */
        result.error.issues[0]?.message ?? "The meal could not be updated.",
    };
  }

  try {
    const plan = await getPlannedMeal(user.id, result.data.planMealId);

    if (!plan) {
      return {
        ...previousState,
        status: "error",
        formError: MISSING_PLAN_MESSAGE,
      };
    }

    if (plan.date !== todayKey()) {
      return {
        ...previousState,
        status: "error",
        formError: "Only today's meals can be ticked. Reload the page.",
      };
    }

    await setPlanMealEaten(user.id, plan.id, result.data.eaten === "true");
    refresh();

    return { status: "success" };
  } catch (error) {
    console.error("Could not update the meal", error);

    return {
      ...previousState,
      status: "error",
      formError: "The meal could not be updated. Please try again.",
    };
  }
}

/**
 * Server action behind the swap picker on the Today page. Requires a signed-in
 * user, validates the submission, accepts today's unticked meals only, replaces
 * the template in place and refreshes the route.
 *
 * @param previousState State returned by the previous submit.
 * @param formData The plan row's `planMealId` and the new `mealId`.
 * @returns An error state with a message, or a success state carrying the new
 * meal's name to announce.
 */
export async function swapMealAction(
  previousState: SwapMealState,
  formData: FormData,
): Promise<SwapMealState> {
  const user = await requireUser();
  const result = parseSwapMealFormData(formData);

  if (!result.success) {
    return {
      ...previousState,
      status: "error",
      // A failed parse always carries at least one issue; the fallback only
      // satisfies the index type.
      formError:
        /* v8 ignore next */
        result.error.issues[0]?.message ?? "The meal could not be swapped.",
    };
  }

  const { planMealId, mealId } = result.data;
  const mealName = formData.get("mealName");

  try {
    const plan = await getPlannedMeal(user.id, planMealId);

    if (!plan) {
      return {
        ...previousState,
        status: "error",
        formError: MISSING_PLAN_MESSAGE,
      };
    }

    if (plan.date !== todayKey()) {
      return {
        ...previousState,
        status: "error",
        formError: "Only today's meals can be swapped. Reload the page.",
      };
    }

    if (plan.eaten) {
      return {
        ...previousState,
        status: "error",
        formError: "Untick this meal before swapping it.",
      };
    }

    await swapPlannedMeal(user.id, plan.id, mealId);
    refresh();

    return {
      status: "success",
      swappedName: typeof mealName === "string" ? mealName : "",
    };
  } catch (error) {
    if (error instanceof PlanTargetNotFoundError) {
      return {
        ...previousState,
        status: "error",
        formError: "That meal no longer exists. Reload the page.",
      };
    }

    console.error("Could not swap the meal", error);

    return {
      ...previousState,
      status: "error",
      formError: "The meal could not be swapped. Please try again.",
    };
  }
}

/**
 * Server action behind closing the welcome tutorial. Requires a signed-in user
 * and records that they've seen it. A failed save is only logged: the worst
 * result is seeing the tutorial once more.
 *
 * @returns Nothing, whether or not the save worked.
 */
export async function markTutorialSeenAction(): Promise<void> {
  const user = await requireUser();

  try {
    await markTutorialSeen(user.id);
  } catch (error) {
    console.error("Could not record that the tutorial was seen", error);
  }
}
