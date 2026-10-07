import { z } from "zod";

/**
 * Highest quantity a single row may ask for, in grams. Wide enough for any
 * real recipe while still catching a stray decimal point.
 */
const MAX_GRAMS = 5000;

/**
 * Builds the validator for one quantity field. Number inputs submit strings,
 * so the value is trimmed and parsed first; blank input becomes `undefined`
 * and therefore a "required" error rather than a "must be a number" one.
 *
 * A quantity has to be greater than zero: an empty row or a zero amount would
 * silently contribute nothing to the meal.
 */
const gramsField = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  },
  z
    .number({
      error: (issue) =>
        issue.input === undefined || issue.input === null
          ? "Grams is required"
          : "Grams must be a number",
    })
    .gt(0, { error: "Grams must be greater than 0" })
    .max(MAX_GRAMS, { error: `Grams cannot be more than ${MAX_GRAMS}` }),
);

/**
 * Validation for the meal form, shared by the create and update actions. The
 * items arrive from the builder's parallel arrays (`ingredientId` and `grams`,
 * one entry per row), assembled by {@link parseMealFormData}.
 */
export const mealSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(80, { error: "Keep the name under 80 characters" }),
  items: z
    .array(
      z.object({
        ingredientId: z.uuid({ error: "Choose an ingredient" }),
        grams: gramsField,
      }),
    )
    .min(1, { error: "Add at least one ingredient" }),
});

/** Validated meal form values, ready to be handed to the repository. */
export type MealInput = z.infer<typeof mealSchema>;

/**
 * Reads the meal form out of a submission and validates it. The builder sends
 * one `ingredientId` and one `grams` entry per row, so the two arrays are zipped
 * back into rows before validation; a row whose half is missing is kept and
 * fails validation with a message at its own index.
 *
 * @param formData Submission of the create or edit form.
 * @returns The parsed values, or a failure carrying per-row messages.
 */
export function parseMealFormData(formData: FormData) {
  const ingredientIds = formData.getAll("ingredientId");
  const grams = formData.getAll("grams");
  const rowCount = Math.max(ingredientIds.length, grams.length);

  return mealSchema.safeParse({
    name: formData.get("name"),
    items: Array.from({ length: rowCount }, (_, index) => ({
      ingredientId: ingredientIds[index] ?? "",
      grams: grams[index],
    })),
  });
}
