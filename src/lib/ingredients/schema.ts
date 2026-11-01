import { z } from "zod";

/**
 * Builds the validator for one macro field. Number inputs submit strings, so
 * the value is trimmed and parsed first; blank input becomes `undefined` and
 * therefore a "required" error rather than a "must be a number" one.
 *
 * @param label Field name used in the user-facing error messages.
 * @param max Highest accepted value, in units per 100 g.
 */
const macroField = (label: string, max: number) =>
  z.preprocess(
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
            ? `${label} is required`
            : `${label} must be a number`,
      })
      .min(0, { error: `${label} cannot be negative` })
      .max(max, { error: `${label} cannot be more than ${max} per 100 g` }),
  );

/** Longest ingredient name accepted, in characters. */
export const MAX_INGREDIENT_NAME_LENGTH = 80;

/**
 * Validation for the ingredient form, shared by the create and update actions.
 * Bounds are deliberately wide enough for any real food while still rejecting
 * obvious typos.
 */
export const ingredientSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(MAX_INGREDIENT_NAME_LENGTH, {
      error: `Keep the name under ${MAX_INGREDIENT_NAME_LENGTH} characters`,
    }),
  caloriesPer100g: macroField("Calories", 900),
  proteinPer100g: macroField("Protein", 100),
  carbsPer100g: macroField("Carbs", 100),
  fatPer100g: macroField("Fat", 100),
});

/** Validated ingredient form values, ready to be handed to the repository. */
export type IngredientInput = z.infer<typeof ingredientSchema>;
