import { describe, expect, test } from "vitest";

import { ingredientSchema } from "@/lib/ingredients/schema";

const validForm = {
  name: "Chicken breast, raw",
  caloriesPer100g: "165",
  proteinPer100g: "31.5",
  carbsPer100g: "0",
  fatPer100g: "3.6",
};

/** Parses `overrides` on top of a complete, valid submission. */
const parse = (overrides: Record<string, unknown>) =>
  ingredientSchema.safeParse({ ...validForm, ...overrides });

/** Messages Zod reported for a single field, or `[]` when it was accepted. */
const errorsFor = (
  field: string,
  overrides: Record<string, unknown>,
): string[] => {
  const result = parse(overrides);
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
};

describe("ingredientSchema: name", () => {
  test("accepts a name and trims the surrounding whitespace", () => {
    const result = ingredientSchema.safeParse({
      ...validForm,
      name: "  Cod  ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Cod");
  });

  test.each([
    ["missing", null],
    ["whitespace only", "   "],
  ])("rejects a %s name", (_case, name) => {
    expect(errorsFor("name", { name })).toEqual(["Name is required"]);
  });

  test("rejects a non-string name", () => {
    expect(errorsFor("name", { name: 42 })).toEqual(["Name is required"]);
  });

  test("accepts a name of exactly 80 characters", () => {
    const result = ingredientSchema.safeParse({
      ...validForm,
      name: "c".repeat(80),
    });
    expect(result.success).toBe(true);
  });

  test("rejects a name longer than 80 characters", () => {
    expect(errorsFor("name", { name: "c".repeat(81) })).toEqual([
      "Keep the name under 80 characters",
    ]);
  });
});

describe("ingredientSchema: macro fields", () => {
  const macros = [
    { field: "caloriesPer100g", label: "Calories", max: 900 },
    { field: "proteinPer100g", label: "Protein", max: 100 },
    { field: "carbsPer100g", label: "Carbohydrates", max: 100 },
    { field: "fatPer100g", label: "Fat", max: 100 },
  ] as const;

  for (const { field, label, max } of macros) {
    describe(field, () => {
      test.each([
        ["an absent field", null],
        ["an empty string", ""],
        ["a whitespace-only string", "   "],
      ])("reports %s as required", (_case, value) => {
        expect(errorsFor(field, { [field]: value })).toEqual([
          `${label} is required`,
        ]);
      });

      test("reports a non-numeric value as a number error", () => {
        expect(errorsFor(field, { [field]: "heavy" })).toEqual([
          `${label} must be a number`,
        ]);
      });

      test("rejects a negative value", () => {
        expect(errorsFor(field, { [field]: "-0.1" })).toEqual([
          `${label} cannot be negative`,
        ]);
      });

      test("rejects a value above the ceiling", () => {
        expect(errorsFor(field, { [field]: String(max + 1) })).toEqual([
          `${label} cannot be more than ${max} per 100 g`,
        ]);
      });

      test("accepts zero", () => {
        expect(errorsFor(field, { [field]: "0" })).toEqual([]);
      });

      test("accepts exactly the ceiling", () => {
        expect(errorsFor(field, { [field]: String(max) })).toEqual([]);
      });

      test("rejects just above the ceiling", () => {
        expect(errorsFor(field, { [field]: max + 0.0001 })).toEqual([
          `${label} cannot be more than ${max} per 100 g`,
        ]);
      });
    });
  }
});

describe("ingredientSchema: parsing", () => {
  test("turns submitted strings into numbers", () => {
    const result = ingredientSchema.safeParse(validForm);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Chicken breast, raw",
      caloriesPer100g: 165,
      proteinPer100g: 31.5,
      carbsPer100g: 0,
      fatPer100g: 3.6,
    });
  });

  test("trims and parses padded numbers", () => {
    const result = ingredientSchema.safeParse({
      ...validForm,
      caloriesPer100g: " 12 ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.caloriesPer100g).toBe(12);
  });

  test("leaves already-numeric values untouched", () => {
    const result = ingredientSchema.safeParse({
      name: "Cod",
      caloriesPer100g: 82,
      proteinPer100g: 17.8,
      carbsPer100g: 0,
      fatPer100g: 0.7,
    });
    expect(result.success).toBe(true);
    expect(result.data?.caloriesPer100g).toBe(82);
  });
});
