import { describe, expect, test } from "vitest";

import { IngredientInUseError } from "@/lib/ingredients/errors";

describe("IngredientInUseError", () => {
  test("carries the meal count and a pluralized message", () => {
    const error = new IngredientInUseError(3);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("IngredientInUseError");
    expect(error.mealCount).toBe(3);
    expect(error.message).toBe("Ingredient is used in 3 meals");
  });

  test("uses the singular for a single meal", () => {
    expect(new IngredientInUseError(1).message).toBe(
      "Ingredient is used in 1 meal",
    );
  });
});
