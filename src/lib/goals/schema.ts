import { z } from "zod";

/**
 * How far a percentage sum may drift from 100 before the schema rejects it.
 * Wide enough for honest rounding like 33.33% × 3 = 99.99% while still
 * catching a user who leaves one field blank or types 70/40/30.
 */
export const PCT_TOLERANCE = 0.5;

/**
 * Builds the validator for one numeric field. Number inputs submit strings, so
 * the value is trimmed and parsed first; blank input becomes `undefined` and
 * therefore a "required" error rather than a "must be a number" one.
 *
 * @param label Field name used in the user-facing error messages.
 * @param min Lowest accepted value, inclusive.
 * @param max Highest accepted value, inclusive.
 * @param minMessage Message when the value is below `min`.
 * @param maxMessage Message when the value is above `max`.
 */
function numericField(
  label: string,
  min: number,
  max: number,
  minMessage: string,
  maxMessage: string,
) {
  return z.preprocess(
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
      .min(min, { error: minMessage })
      .max(max, { error: maxMessage }),
  );
}

/** A daily budget field: at least 1 kcal, with a ceiling for stray decimals. */
const caloriesField = numericField(
  "Calories",
  1,
  10000,
  "Calories must be at least 1",
  "Calories cannot be more than 10000",
);

/** One of the three macro shares: a percentage between 0 and 100. */
const percentField = (label: string) =>
  numericField(
    label,
    0,
    100,
    `${label} cannot be negative`,
    `${label} cannot be more than 100`,
  );

/**
 * Rounds a percentage sum for display in the "must add up to 100%" message so
 * floating-point leftovers like 99.999999 never leak into the UI.
 *
 * @param value The raw sum.
 * @returns The sum with at most one decimal place.
 */
function formatPctTotal(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * Validation for the goals form, shared by the create and update path (there
 * is a single goals row, so both go through the same action). The slots
 * arrive from the form's parallel arrays (`slotName` and `slotPercent`, one
 * entry per meal), assembled by {@link parseGoalsFormData}.
 *
 * Two cross-field constraints are checked in a `superRefine` and reported with
 * an empty path so the action surfaces them as a form-level error: the macro
 * shares must sum to 100, and the meal shares must sum to 100.
 */
export const goalsSchema = z
  .object({
    calories: caloriesField,
    proteinPct: percentField("Protein"),
    carbsPct: percentField("Carbs"),
    fatPct: percentField("Fat"),
    slots: z
      .array(
        z.object({
          slotId: z.uuid().optional(),
          name: z
            .string({ error: "Name is required" })
            .trim()
            .min(1, { error: "Name is required" })
            .max(40, { error: "Keep the name under 40 characters" }),
          percent: percentField("Meal share"),
        }),
      )
      .min(1, { error: "Add at least one meal" }),
  })
  .superRefine((goals, ctx) => {
    const macroSum = goals.proteinPct + goals.carbsPct + goals.fatPct;
    if (Math.abs(macroSum - 100) > PCT_TOLERANCE) {
      ctx.addIssue({
        code: "custom",
        message: `Protein, carbs and fat must add up to 100% (currently ${formatPctTotal(macroSum)}%)`,
      });
    }

    const slotSum = goals.slots.reduce((sum, slot) => sum + slot.percent, 0);
    if (Math.abs(slotSum - 100) > PCT_TOLERANCE) {
      ctx.addIssue({
        code: "custom",
        message: `Meal shares must add up to 100% (currently ${formatPctTotal(slotSum)}%)`,
      });
    }
  });

/** Validated goals form values, ready to be handed to the repository. */
export type GoalsInput = z.infer<typeof goalsSchema>;

/**
 * Reads the goals form out of a submission and validates it. The form sends
 * one `slotName` and one `slotPercent` entry per meal, so the two arrays are
 * zipped back into rows before validation; a row whose half is missing is kept
 * and fails validation with a message at its own index. The meal count drops
 * out implicitly from the number of rows.
 *
 * @param formData Submission of the goals form.
 * @returns The parsed values, or a failure carrying per-field messages plus
 * the form-level sum errors.
 */
export function parseGoalsFormData(formData: FormData) {
  const slotIds = formData.getAll("slotId");
  const names = formData.getAll("slotName");
  const percents = formData.getAll("slotPercent");
  const rowCount = Math.max(names.length, percents.length);

  return goalsSchema.safeParse({
    calories: formData.get("calories"),
    proteinPct: formData.get("proteinPct"),
    carbsPct: formData.get("carbsPct"),
    fatPct: formData.get("fatPct"),
    slots: Array.from({ length: rowCount }, (_, index) => {
      const slotId = slotIds[index];

      return {
        slotId:
          typeof slotId === "string" && slotId !== "" ? slotId : undefined,
        name: names[index] ?? "",
        percent: percents[index],
      };
    }),
  });
}
