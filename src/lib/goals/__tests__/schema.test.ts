import { describe, expect, test } from "vitest";

import {
  goalsFieldErrors,
  type GoalsFieldErrors,
} from "@/lib/goals/form-state";
import { goalsSchema, parseGoalsFormData } from "@/lib/goals/schema";
import {
  goalsDefaults,
  makeGoalsFormData,
  makeValidGoalsFormData,
} from "@test/factories";

/** Messages reported for one dotted field path, or `[]` when the field passed. */
const errorsFor = (formData: FormData, path: string): string[] => {
  const result = parseGoalsFormData(formData);
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path.join(".") === path)
    .map((issue) => issue.message);
};

/** Form-level messages (sum violations) of a submission. */
const formErrorsOf = (formData: FormData): string[] => {
  const result = parseGoalsFormData(formData);
  if (result.success) return [];
  return goalsFieldErrors(result.error).formErrors;
};

/** Flattened messages of a submission that must fail validation. */
const fieldErrorsOf = (formData: FormData): GoalsFieldErrors => {
  const result = parseGoalsFormData(formData);
  if (result.success) throw new Error("expected the submission to be rejected");
  return goalsFieldErrors(result.error).fieldErrors;
};

describe("parseGoalsFormData: happy path", () => {
  test("parses the scalar fields and zips the parallel slot arrays", () => {
    const result = parseGoalsFormData(makeValidGoalsFormData());

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      calories: 2000,
      proteinPct: 30,
      carbsPct: 40,
      fatPct: 30,
      slots: [
        { name: "Breakfast", percent: 30 },
        { name: "Lunch", percent: 40 },
        { name: "Dinner", percent: 30 },
      ],
    });
  });

  test("trims whitespace from names and padded numbers", () => {
    const result = parseGoalsFormData(
      makeValidGoalsFormData(
        { calories: " 2500 ", proteinPct: " 20 ", carbsPct: " 50 " },
        [
          { name: "  Brunch  ", percent: " 50 " },
          { name: "Dinner", percent: "50" },
        ],
      ),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      calories: 2500,
      proteinPct: 20,
      carbsPct: 50,
      fatPct: 30,
      slots: [
        { name: "Brunch", percent: 50 },
        { name: "Dinner", percent: 50 },
      ],
    });
  });
});

describe("parseGoalsFormData: scalar fields", () => {
  test.each([
    ["calories", "Calories"],
    ["proteinPct", "Protein"],
    ["carbsPct", "Carbohydrates"],
    ["fatPct", "Fat"],
  ])("reports a missing or blank %s as required", (field, label) => {
    expect(errorsFor(makeValidGoalsFormData({ [field]: null }), field)).toEqual(
      [`${label} is required`],
    );
    expect(errorsFor(makeValidGoalsFormData({ [field]: "  " }), field)).toEqual(
      [`${label} is required`],
    );
  });

  test("reports a non-numeric value as a number error", () => {
    expect(
      errorsFor(makeValidGoalsFormData({ calories: "lots" }), "calories"),
    ).toEqual(["Calories must be a number"]);
  });

  test("calories accepts 1 and rejects 0 and negatives", () => {
    expect(
      errorsFor(makeValidGoalsFormData({ calories: "1" }), "calories"),
    ).toEqual([]);
    expect(
      errorsFor(makeValidGoalsFormData({ calories: "0" }), "calories"),
    ).toEqual(["Calories must be at least 1"]);
    expect(
      errorsFor(makeValidGoalsFormData({ calories: "-5" }), "calories"),
    ).toEqual(["Calories must be at least 1"]);
  });

  test("calories accepts the 10000 ceiling and rejects above it", () => {
    expect(
      errorsFor(makeValidGoalsFormData({ calories: "10000" }), "calories"),
    ).toEqual([]);
    expect(
      errorsFor(makeValidGoalsFormData({ calories: "10000.1" }), "calories"),
    ).toEqual(["Calories cannot be more than 10000"]);
  });

  test("percent fields accept 0 and 100 but reject out-of-range values", () => {
    expect(
      errorsFor(makeValidGoalsFormData({ proteinPct: "0" }), "proteinPct"),
    ).toEqual([]);
    expect(
      errorsFor(makeValidGoalsFormData({ proteinPct: "100" }), "proteinPct"),
    ).toEqual([]);
    expect(
      errorsFor(makeValidGoalsFormData({ proteinPct: "-1" }), "proteinPct"),
    ).toEqual(["Protein cannot be negative"]);
    expect(
      errorsFor(makeValidGoalsFormData({ proteinPct: "101" }), "proteinPct"),
    ).toEqual(["Protein cannot be more than 100"]);
  });
});

describe("parseGoalsFormData: macro sums", () => {
  test("accepts shares that add up to 100", () => {
    const result = parseGoalsFormData(
      makeValidGoalsFormData({
        proteinPct: "30",
        carbsPct: "40",
        fatPct: "30",
      }),
    );

    expect(result.success).toBe(true);
  });

  test("tolerates rounding leftovers such as 33.33 × 3", () => {
    const result = parseGoalsFormData(
      makeValidGoalsFormData({
        proteinPct: "33.33",
        carbsPct: "33.33",
        fatPct: "33.34",
      }),
    );

    expect(result.success).toBe(true);
  });

  test("rejects shares that drift from 100 as a form error", () => {
    const formData = makeValidGoalsFormData({
      proteinPct: "70",
      carbsPct: "40",
      fatPct: "30",
    });

    expect(formErrorsOf(formData)).toEqual([
      "Protein, carbs and fat must add up to 100% (currently 140%)",
    ]);
  });

  test("a blank share is a required-field error, not a sum error", () => {
    const formData = makeValidGoalsFormData({ proteinPct: "  " });

    expect(errorsFor(formData, "proteinPct")).toEqual(["Protein is required"]);
    expect(formErrorsOf(formData)).toEqual([]);
  });
});

describe("parseGoalsFormData: slots", () => {
  test("rejects a submission with no meal rows at all", () => {
    expect(errorsFor(makeValidGoalsFormData({}, []), "slots")).toEqual([
      "Add at least one meal",
    ]);
  });

  test.each([
    ["an empty name", ""],
    ["a whitespace-only name", "   "],
  ])("rejects %s in a slot row", (_case, name) => {
    expect(
      errorsFor(
        makeValidGoalsFormData({}, [{ name, percent: "100" }]),
        "slots.0.name",
      ),
    ).toEqual(["Name is required"]);
  });

  test("accepts a slot name of exactly 40 characters", () => {
    const result = parseGoalsFormData(
      makeValidGoalsFormData({}, [{ name: "n".repeat(40), percent: "100" }]),
    );

    expect(result.success).toBe(true);
  });

  test("rejects a slot name longer than 40 characters", () => {
    expect(
      errorsFor(
        makeValidGoalsFormData({}, [{ name: "n".repeat(41), percent: "100" }]),
        "slots.0.name",
      ),
    ).toEqual(["Keep the name under 40 characters"]);
  });

  test("rejects a share outside 0–100 under its own row", () => {
    expect(
      errorsFor(
        makeValidGoalsFormData({}, [{ name: "Dinner", percent: "250" }]),
        "slots.0.percent",
      ),
    ).toEqual(["Meal share cannot be more than 100"]);
  });

  test("keeps a row whose percent is missing and blames the percent", () => {
    const formData = makeGoalsFormData(
      {
        calories: String(goalsDefaults.calories),
        proteinPct: String(goalsDefaults.proteinPct),
        carbsPct: String(goalsDefaults.carbsPct),
        fatPct: String(goalsDefaults.fatPct),
      },
      [
        { name: "Breakfast", percent: "100" },
        { name: "Lunch", percent: null },
      ],
    );

    expect(errorsFor(formData, "slots.1.percent")).toEqual([
      "Meal share is required",
    ]);
    expect(errorsFor(formData, "slots.1.name")).toEqual([]);
  });

  test("rejects slot shares that do not sum to 100 as a form error", () => {
    const formData = makeValidGoalsFormData({}, [
      { name: "Breakfast", percent: "50" },
      { name: "Lunch", percent: "30" },
    ]);

    expect(formErrorsOf(formData)).toEqual([
      "Meal shares must add up to 100% (currently 80%)",
    ]);
  });

  test("tolerates slot shares that only drift by rounding", () => {
    const result = parseGoalsFormData(
      makeValidGoalsFormData({}, [
        { name: "Meal 1", percent: "33.33" },
        { name: "Meal 2", percent: "33.33" },
        { name: "Meal 3", percent: "33.34" },
      ]),
    );

    expect(result.success).toBe(true);
  });
});

describe("goalsSchema", () => {
  test("accepts values that already carry numbers", () => {
    const result = goalsSchema.safeParse({
      ...goalsDefaults,
      slots: goalsDefaults.slots,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(goalsDefaults);
  });
});

describe("goalsFieldErrors", () => {
  test("keys each row's message by its full path", () => {
    const fieldErrors = fieldErrorsOf(
      makeValidGoalsFormData(
        { proteinPct: "30", carbsPct: "40", fatPct: "30" },
        [
          { name: "Breakfast", percent: "100" },
          { name: "Lunch", percent: "" },
        ],
      ),
    );

    expect(fieldErrors).toEqual({
      "slots.1.percent": ["Meal share is required"],
    });
  });

  test("keys scalar messages under their fields", () => {
    expect(fieldErrorsOf(makeValidGoalsFormData({ calories: "0" }))).toEqual({
      calories: ["Calories must be at least 1"],
    });
  });

  test("keys sum violations as form errors, not field errors", () => {
    const result = parseGoalsFormData(
      makeValidGoalsFormData({
        proteinPct: "10",
        carbsPct: "20",
        fatPct: "30",
      }),
    );
    if (result.success)
      throw new Error("expected the submission to be rejected");

    const { fieldErrors, formErrors } = goalsFieldErrors(result.error);

    expect(fieldErrors).toEqual({});
    expect(formErrors).toEqual([
      "Protein, carbs and fat must add up to 100% (currently 60%)",
    ]);
  });
});
