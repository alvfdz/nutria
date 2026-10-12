"use server";

import { refresh } from "next/cache";

import { goalsFieldErrors, type GoalsFormState } from "@/lib/goals/form-state";
import { saveGoals } from "@/lib/goals/repository";
import { parseGoalsFormData } from "@/lib/goals/schema";

/**
 * Server action behind the goals form. Validates the submission, stores the
 * single goals row, and refreshes the route so the form re-seeds from the
 * saved values.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission of the form.
 * @returns An error state with field or form messages, or a success state
 * with a bumped reset key and a message to announce.
 */
export async function saveGoalsAction(
  previousState: GoalsFormState,
  formData: FormData,
): Promise<GoalsFormState> {
  const result = parseGoalsFormData(formData);

  if (!result.success) {
    const { fieldErrors, formErrors } = goalsFieldErrors(result.error);

    return {
      ...previousState,
      status: "error",
      fieldErrors,
      formError: formErrors[0],
    };
  }

  try {
    await saveGoals(result.data);
    refresh();

    return {
      status: "success",
      resetKey: previousState.resetKey + 1,
      savedMessage: "Goals saved.",
    };
  } catch (error) {
    console.error("Could not save the goals", error);

    return {
      ...previousState,
      status: "error",
      formError: "The goals could not be saved. Please try again.",
    };
  }
}
