"use server";

import { refresh } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { formatDayLabel } from "@/lib/calendar/week";
import { MealInUseError, UnknownIngredientError } from "@/lib/meals/errors";
import {
  mealFieldErrors,
  type MealDeleteState,
  type MealFormState,
} from "@/lib/meals/form-state";
import { createMeal, deleteMeal, updateMeal } from "@/lib/meals/repository";
import { parseMealFormData } from "@/lib/meals/schema";

/**
 * Reads the hidden `id` field that identifies the meal to mutate.
 *
 * @param formData Submission of the edit or delete form.
 * @returns The id, or `null` when it is missing or empty.
 */
function readMealId(formData: FormData): string | null {
  const id = formData.get("id");
  return typeof id === "string" && id !== "" ? id : null;
}

/**
 * Picks the form-level message for a failed save. A write that hit a
 * foreign key on an unknown ingredient deserves a specific answer, because
 * reloading is the only way out; everything else is a transient failure.
 *
 * @param error Whatever the repository threw.
 * @returns The message to show under the form.
 */
function saveErrorMessage(error: unknown): string {
  if (error instanceof UnknownIngredientError) {
    return "That ingredient no longer exists. Reload the page and try again.";
  }

  return "The meal could not be saved. Please try again.";
}

/**
 * Server action behind the "New meal" form. Validates the submission, stores
 * the meal, and refreshes the current route so the library shows it.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission of the form.
 * @returns An error state with field or form messages, or a success state
 * carrying the saved name and a bumped reset key.
 */
export async function createMealAction(
  previousState: MealFormState,
  formData: FormData,
): Promise<MealFormState> {
  // Outside any try/catch: when signed out, the redirect it throws has to
  // reach Next.js rather than be reported as a failed save.
  const user = await requireUser();

  const result = parseMealFormData(formData);

  if (!result.success) {
    return {
      ...previousState,
      status: "error",
      fieldErrors: mealFieldErrors(result.error),
      formError: undefined,
    };
  }

  try {
    const meal = await createMeal(user.id, result.data);
    refresh();

    return {
      status: "success",
      resetKey: previousState.resetKey + 1,
      savedName: meal.name,
    };
  } catch (error) {
    console.error("Could not save the meal", error);

    return {
      ...previousState,
      status: "error",
      formError: saveErrorMessage(error),
    };
  }
}

/**
 * Server action behind the edit dialog. Validates the submission, updates the
 * meal identified by the hidden `id` field, and refreshes the route.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission of the form.
 * @returns An error state with field or form messages, or a success state
 * carrying the saved name and a bumped reset key.
 */
export async function updateMealAction(
  previousState: MealFormState,
  formData: FormData,
): Promise<MealFormState> {
  const user = await requireUser();

  const id = readMealId(formData);
  if (!id) {
    return {
      ...previousState,
      status: "error",
      formError: "The meal could not be saved. Please try again.",
    };
  }

  const result = parseMealFormData(formData);

  if (!result.success) {
    return {
      ...previousState,
      status: "error",
      fieldErrors: mealFieldErrors(result.error),
      formError: undefined,
    };
  }

  try {
    const meal = await updateMeal(user.id, id, result.data);
    refresh();

    return {
      status: "success",
      resetKey: previousState.resetKey + 1,
      savedName: meal.name,
    };
  } catch (error) {
    console.error("Could not update the meal", error);

    return {
      ...previousState,
      status: "error",
      formError: saveErrorMessage(error),
    };
  }
}

/**
 * Server action behind the delete confirmation. The meal name travels back in
 * a hidden field so the client can announce it to screen readers without
 * re-reading the store.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission of the form.
 * @returns An error state, or a success state carrying the deleted name.
 */
export async function deleteMealAction(
  previousState: MealDeleteState,
  formData: FormData,
): Promise<MealDeleteState> {
  const user = await requireUser();

  const id = readMealId(formData);
  const name = formData.get("name");

  if (!id) {
    return {
      ...previousState,
      status: "error",
      formError: "The meal could not be deleted. Please try again.",
    };
  }

  try {
    await deleteMeal(user.id, id);
    refresh();

    return {
      status: "success",
      deletedName: typeof name === "string" ? name : "",
    };
  } catch (error) {
    // A meal that is still planned today or later cannot be deleted, because
    // that would silently drop it from the forward plan.
    if (error instanceof MealInUseError) {
      const days = error.dayKeys.map(formatDayLabel).join(", ");

      return {
        ...previousState,
        status: "error",
        formError: `This meal is still planned on ${days}. Remove those plans before deleting it.`,
      };
    }

    console.error("Could not delete the meal", error);

    return {
      ...previousState,
      status: "error",
      formError: "The meal could not be deleted. Please try again.",
    };
  }
}
