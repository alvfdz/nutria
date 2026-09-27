import { z } from "zod";

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

export const ingredientSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(80, { error: "Keep the name under 80 characters" }),
  caloriesPer100g: macroField("Calories", 900),
  proteinPer100g: macroField("Protein", 100),
  carbsPer100g: macroField("Carbohydrates", 100),
  fatPer100g: macroField("Fat", 100),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;
