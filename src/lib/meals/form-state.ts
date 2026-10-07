import type { z } from "zod";

/**
 * The form fields the meal validator reports on: the meal name, the `items`
 * list itself (when there are no rows at all), and one `items.<index>.<field>`
 * key per row so the builder can show a message under the exact input.
 */
export type MealFieldErrorKey =
  "name" | "items" | `items.${number}.${"ingredientId" | "grams"}`;

/** Validation messages keyed by field name, as produced by {@link mealFieldErrors}. */
export type MealFieldErrors = Partial<
  Record<MealFieldErrorKey, string[] | undefined>
>;

/**
 * State returned by the create and update actions on every submit, consumed by
 * `useActionState`.
 */
export type MealFormState = {
  /** Outcome of the last submit. */
  status: "idle" | "error" | "success";
  /**
   * Bumped after a successful save; the form keys its fields on it so React
   * remounts them and clears the previously entered values.
   */
  resetKey: number;
  /** Per-field validation messages, present when validation failed. */
  fieldErrors?: MealFieldErrors;
  /** Message for a failure that is not tied to a single field. */
  formError?: string;
  /** Name echoed back on success so it can be announced to screen readers. */
  savedName?: string;
};

/** State a freshly mounted meal form starts from. */
export const initialMealFormState: MealFormState = {
  status: "idle",
  resetKey: 0,
};

/** State returned by the delete action on every submit. */
export type MealDeleteState = {
  /** Outcome of the last submit. */
  status: "idle" | "error" | "success";
  /** Message for a failure such as an unknown id. */
  formError?: string;
  /** Name echoed back on success so it can be announced to screen readers. */
  deletedName?: string;
};

/** State a freshly mounted delete confirmation starts from. */
export const initialMealDeleteState: MealDeleteState = {
  status: "idle",
};

/**
 * Flattens a validation failure into messages keyed by field name. `zod`'s own
 * `flattenError` collapses every row of a nested array under one `items` key,
 * which is useless to a form with one input per row; this keeps the full path
 * (`items.2.grams`) so each message lands under its own input.
 *
 * @param error The failure `mealSchema.safeParse` returned.
 * @returns The first-to-last messages of each field, keyed by field name.
 */
export function mealFieldErrors(error: z.ZodError): MealFieldErrors {
  const fieldErrors: MealFieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") as MealFieldErrorKey;
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return fieldErrors;
}
