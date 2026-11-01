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

/**
 * Validation messages attached to the rows they were reported on, keyed by
 * {@link mealRowErrorKey} plus `name` and `items`.
 */
export type KeyedMealErrors = Record<string, string[] | undefined>;

/**
 * The key of one row field's messages in {@link KeyedMealErrors}.
 *
 * @param rowKey The builder row's stable key.
 * @param field The field of the row.
 * @returns The key.
 */
export function mealRowErrorKey(
  rowKey: string,
  field: "ingredientId" | "grams",
): string {
  return `${rowKey}.${field}`;
}

/**
 * Attaches a submit's messages to the builder rows it covered. The validator
 * reports rows by position, which stops being true as soon as a row is removed;
 * a row's stable key stays right.
 *
 * @param fieldErrors The messages of the submit.
 * @param rowKeys The rows' keys, in the order they were submitted.
 * @returns The messages by name, `items` or row field. A message for a row that
 *   is no longer there is dropped.
 */
export function keyMealErrorsByRow(
  fieldErrors: MealFieldErrors,
  rowKeys: string[],
): KeyedMealErrors {
  const keyed: KeyedMealErrors = {};

  for (const [key, messages] of Object.entries(fieldErrors)) {
    const match = /^items\.(\d+)\.(ingredientId|grams)$/.exec(key);
    if (!match) {
      keyed[key] = messages;
      continue;
    }

    const rowKey = rowKeys[Number(match[1])];
    if (rowKey !== undefined) {
      keyed[mealRowErrorKey(rowKey, match[2] as "ingredientId" | "grams")] =
        messages;
    }
  }

  return keyed;
}

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
