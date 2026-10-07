import { describe, expect, test } from "vitest";

import { mealFieldErrors, type MealFieldErrors } from "@/lib/meals/form-state";
import { mealSchema, parseMealFormData } from "@/lib/meals/schema";
import {
  makeMealFormData,
  makeValidMealFormData,
  mealDefaults,
} from "@test/factories";

const OATS_ID = "9f1c1f9e-0000-4000-8000-000000000001";
const MILK_ID = "9f1c1f9e-0000-4000-8000-000000000002";

/** Messages reported for one dotted field path, or `[]` when the field passed. */
const errorsFor = (formData: FormData, path: string): string[] => {
  const result = parseMealFormData(formData);
  if (result.success) return [];
  return result.error.issues
    .filter((issue) => issue.path.join(".") === path)
    .map((issue) => issue.message);
};

/** Flattened messages of a submission that must fail validation. */
const fieldErrorsOf = (formData: FormData): MealFieldErrors => {
  const result = parseMealFormData(formData);
  if (result.success) throw new Error("expected the submission to be rejected");
  return mealFieldErrors(result.error);
};

describe("parseMealFormData: happy path", () => {
  test("zips the parallel arrays back into rows in order", () => {
    const result = parseMealFormData(
      makeValidMealFormData({}, [
        { ingredientId: OATS_ID, grams: "80" },
        { ingredientId: MILK_ID, grams: "200" },
      ]),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: mealDefaults.name,
      items: [
        { ingredientId: OATS_ID, grams: 80 },
        { ingredientId: MILK_ID, grams: 200 },
      ],
    });
  });

  test("trims the surrounding whitespace off the name", () => {
    const result = parseMealFormData(
      makeValidMealFormData({ name: "  Overnight oats  " }),
    );

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Overnight oats");
  });

  test("parses decimal and whitespace-padded grams", () => {
    const result = parseMealFormData(
      makeValidMealFormData({}, [
        { ingredientId: OATS_ID, grams: " 12.5 " },
        { ingredientId: MILK_ID, grams: "0.5" },
      ]),
    );

    expect(result.success).toBe(true);
    expect(result.data?.items.map((item) => item.grams)).toEqual([12.5, 0.5]);
  });
});

describe("parseMealFormData: name", () => {
  test.each([
    ["an empty name", ""],
    ["a whitespace-only name", "   "],
  ])("rejects %s", (_case, name) => {
    expect(errorsFor(makeValidMealFormData({ name }), "name")).toEqual([
      "Name is required",
    ]);
  });

  test("rejects a submission with no name field at all", () => {
    expect(errorsFor(makeValidMealFormData({ name: null }), "name")).toEqual([
      "Name is required",
    ]);
  });

  test("accepts a name of exactly 80 characters", () => {
    const result = parseMealFormData(
      makeValidMealFormData({ name: "c".repeat(80) }),
    );

    expect(result.success).toBe(true);
  });

  test("rejects a name longer than 80 characters", () => {
    expect(
      errorsFor(makeValidMealFormData({ name: "c".repeat(81) }), "name"),
    ).toEqual(["Keep the name under 80 characters"]);
  });
});

describe("parseMealFormData: rows", () => {
  test("rejects a submission with no rows at all", () => {
    expect(errorsFor(makeValidMealFormData({}, []), "items")).toEqual([
      "Add at least one ingredient",
    ]);
  });

  test.each([
    ["an empty quantity", ""],
    ["a whitespace-only quantity", "   "],
  ])("rejects %s as required", (_case, grams) => {
    expect(
      errorsFor(
        makeValidMealFormData({}, [{ ingredientId: OATS_ID, grams }]),
        "items.0.grams",
      ),
    ).toEqual(["Grams is required"]);
  });

  test("reports a non-numeric quantity as a number error", () => {
    expect(
      errorsFor(
        makeValidMealFormData({}, [{ ingredientId: OATS_ID, grams: "heavy" }]),
        "items.0.grams",
      ),
    ).toEqual(["Grams must be a number"]);
  });

  test.each([
    ["zero", "0"],
    ["a negative value", "-10"],
  ])("rejects %s", (_case, grams) => {
    expect(
      errorsFor(
        makeValidMealFormData({}, [{ ingredientId: OATS_ID, grams }]),
        "items.0.grams",
      ),
    ).toEqual(["Grams must be greater than 0"]);
  });

  test("accepts exactly the 5000 g ceiling", () => {
    const result = parseMealFormData(
      makeValidMealFormData({}, [{ ingredientId: OATS_ID, grams: "5000" }]),
    );

    expect(result.success).toBe(true);
  });

  test("rejects a quantity above the ceiling", () => {
    expect(
      errorsFor(
        makeValidMealFormData({}, [{ ingredientId: OATS_ID, grams: "5001" }]),
        "items.0.grams",
      ),
    ).toEqual(["Grams cannot be more than 5000"]);
  });

  test("rejects an ingredient id that is not a UUID", () => {
    expect(
      errorsFor(
        makeValidMealFormData({}, [
          { ingredientId: "chicken-breast", grams: "80" },
        ]),
        "items.0.ingredientId",
      ),
    ).toEqual(["Choose an ingredient"]);
  });

  test("keeps a row whose grams outnumber the ids and blames the id", () => {
    const formData = makeMealFormData({ name: mealDefaults.name }, [
      { ingredientId: OATS_ID, grams: "80" },
      { ingredientId: null, grams: "200" },
    ]);

    expect(errorsFor(formData, "items.1.ingredientId")).toEqual([
      "Choose an ingredient",
    ]);
    expect(errorsFor(formData, "items.1.grams")).toEqual([]);
  });

  test("keeps a row whose ids outnumber the grams and blames the grams", () => {
    const formData = makeMealFormData({ name: mealDefaults.name }, [
      { ingredientId: OATS_ID, grams: "80" },
      { ingredientId: MILK_ID, grams: null },
    ]);

    expect(errorsFor(formData, "items.1.ingredientId")).toEqual([]);
    expect(errorsFor(formData, "items.1.grams")).toEqual(["Grams is required"]);
  });
});

describe("mealSchema", () => {
  test("accepts rows that already carry numbers and trims the name", () => {
    const result = mealSchema.safeParse({
      name: "  Overnight oats  ",
      items: [{ ingredientId: OATS_ID, grams: 12.5 }],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Overnight oats",
      items: [{ ingredientId: OATS_ID, grams: 12.5 }],
    });
  });
});

describe("mealFieldErrors", () => {
  test("keys each row's message by its full path", () => {
    const fieldErrors = fieldErrorsOf(
      makeValidMealFormData({}, [
        { ingredientId: OATS_ID, grams: "80" },
        { ingredientId: MILK_ID, grams: "0" },
      ]),
    );

    expect(fieldErrors).toEqual({
      "items.1.grams": ["Grams must be greater than 0"],
    });
  });

  test("keys a name message under name and the list itself under items", () => {
    expect(fieldErrorsOf(makeValidMealFormData({ name: "   " }))).toEqual({
      name: ["Name is required"],
    });
    expect(fieldErrorsOf(makeValidMealFormData({}, []))).toEqual({
      items: ["Add at least one ingredient"],
    });
  });
});
