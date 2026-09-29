import type { IngredientInput } from "./schema";

/** Validation messages keyed by field name, as produced by `z.flattenError`. */
export type IngredientFieldErrors = Partial<
  Record<keyof IngredientInput, string[] | undefined>
>;

/**
 * State returned by the create and update actions on every submit, consumed by
 * `useActionState`.
 */
export type IngredientFormState = {
  /** Outcome of the last submit. */
  status: "idle" | "error" | "success";
  /**
   * Bumped after a successful save; the form keys its fields on it so React
   * remounts them and clears the previously entered values.
   */
  resetKey: number;
  /** Per-field validation messages, present when validation failed. */
  fieldErrors?: IngredientFieldErrors;
  /** Message for a failure that is not tied to a single field. */
  formError?: string;
  /** Name echoed back on success so it can be announced to screen readers. */
  savedName?: string;
};

/** State a freshly mounted ingredient form starts from. */
export const initialIngredientFormState: IngredientFormState = {
  status: "idle",
  resetKey: 0,
};

/** State returned by the delete action on every submit. */
export type IngredientDeleteState = {
  /** Outcome of the last submit. */
  status: "idle" | "error" | "success";
  /** Message for a failure such as an unknown id. */
  formError?: string;
  /** Name echoed back on success so it can be announced to screen readers. */
  deletedName?: string;
};

/** State a freshly mounted delete confirmation starts from. */
export const initialIngredientDeleteState: IngredientDeleteState = {
  status: "idle",
};
