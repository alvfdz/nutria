import { z } from "zod";

import { isDateKey } from "@/lib/calendar/week";

/**
 * Validation for the assign dialog's submission: which template, into which
 * slot, on which day. The date has to be a real calendar key; the two ids are
 * checked as UUIDs so a tampered form cannot address another row's shape.
 */
export const assignMealSchema = z.object({
  date: z.string().refine(isDateKey, { error: "Choose a valid date" }),
  mealSlotId: z.uuid({ error: "Choose a meal slot" }),
  mealId: z.uuid({ error: "Choose a meal" }),
});

/** Validated assign submission, ready for the repository. */
export type AssignMealInput = z.infer<typeof assignMealSchema>;

/**
 * Validation for the remove form's submission: the id of the plan row to
 * delete.
 */
export const removeMealSchema = z.object({
  planMealId: z.uuid({ error: "Choose a planned meal" }),
});

/**
 * Reads the assign dialog's form out of a submission and validates it.
 *
 * @param formData Submission of the assign dialog.
 * @returns The parsed values, or a failure carrying the messages.
 */
export function parseAssignMealFormData(formData: FormData) {
  return assignMealSchema.safeParse({
    date: formData.get("date"),
    mealSlotId: formData.get("mealSlotId"),
    mealId: formData.get("mealId"),
  });
}

/**
 * Reads the remove form out of a submission and validates it.
 *
 * @param formData Submission of the remove form.
 * @returns The parsed value, or a failure carrying the messages.
 */
export function parseRemoveMealFormData(formData: FormData) {
  return removeMealSchema.safeParse({
    planMealId: formData.get("planMealId"),
  });
}
