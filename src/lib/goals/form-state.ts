import type { z } from "zod";

/**
 * The form fields the goals validator reports on: the four budget inputs, the
 * `slots` list itself (when there are no meals at all), and one
 * `slots.<index>.<field>` key per meal so the form can show a message under
 * the exact input.
 */
export type GoalsFieldErrorKey =
  | "calories"
  | "proteinPct"
  | "carbsPct"
  | "fatPct"
  | "slots"
  | `slots.${number}.${"name" | "percent"}`;

/** Validation messages keyed by field name, as produced by {@link goalsFieldErrors}. */
export type GoalsFieldErrors = Partial<
  Record<GoalsFieldErrorKey, string[] | undefined>
>;

/**
 * State returned by the save action on every submit, consumed by
 * `useActionState`.
 */
export type GoalsFormState = {
  /** Outcome of the last submit. */
  status: "idle" | "error" | "success";
  /**
   * Bumped after a successful save; combined with the page re-rendering on
   * `refresh()`, it helps the form's `updatedAt` remount key change.
   */
  resetKey: number;
  /** Per-field validation messages, present when validation failed. */
  fieldErrors?: GoalsFieldErrors;
  /** Message for a failure not tied to a single field, such as a sum error. */
  formError?: string;
  /** Message echoed back on success so it can be announced to screen readers. */
  savedMessage?: string;
};

/** State a freshly mounted goals form starts from. */
export const initialGoalsFormState: GoalsFormState = {
  status: "idle",
  resetKey: 0,
};

/**
 * Flattens a validation failure into messages keyed by field name. The
 * cross-field "sum to 100" issues are reported with an empty path, so they are
 * separated out as form-level messages for the action to show above the form;
 * everything else keeps its full path (`slots.2.percent`) so each message
 * lands under its own input.
 *
 * @param error The failure `goalsSchema.safeParse` returned.
 * @returns The per-field messages and the form-level sum messages.
 */
export function goalsFieldErrors(error: z.ZodError): {
  fieldErrors: GoalsFieldErrors;
  formErrors: string[];
} {
  const fieldErrors: GoalsFieldErrors = {};
  const formErrors: string[] = [];

  for (const issue of error.issues) {
    if (issue.path.length === 0) {
      formErrors.push(issue.message);
      continue;
    }

    const key = issue.path.join(".") as GoalsFieldErrorKey;
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return { fieldErrors, formErrors };
}
