import { describe, expect, test } from "vitest";

import type { Ingredient } from "@/lib/ingredients/types";
import { computeMealTotals, sumMealItems } from "@/lib/meals/macros";
import type { MealItem } from "@/lib/meals/types";
import { makeIngredient, makeMeal } from "@test/factories";

/** Builds one stored meal item wrapping `ingredient` at `grams`. */
const item = (
  ingredient: Ingredient,
  grams: number,
  sortOrder = 0,
): MealItem => ({
  id: `meal-item-${sortOrder + 1}`,
  sortOrder,
  grams,
  ingredientId: ingredient.id,
  ingredient,
});

describe("computeMealTotals", () => {
  test("returns all zeroes for a meal with no items", () => {
    expect(computeMealTotals({ items: [] })).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  test("totals a single 100 g item straight from its per-100g densities", () => {
    const oats = makeIngredient({
      id: "oats",
      name: "Oats",
      caloriesPer100g: 389,
      proteinPer100g: 16.9,
      carbsPer100g: 66.3,
      fatPer100g: 6.9,
    });

    expect(computeMealTotals({ items: [item(oats, 100)] })).toEqual({
      calories: 389,
      protein: 16.9,
      carbs: 66.3,
      fat: 6.9,
    });
  });

  test("scales the densities by fractional grams", () => {
    const chicken = makeIngredient();

    expect(computeMealTotals({ items: [item(chicken, 50)] })).toEqual({
      calories: 82.5,
      protein: 15.75,
      carbs: 0,
      fat: 1.8,
    });
  });

  test("sums every item of the factory meal", () => {
    const totals = computeMealTotals(makeMeal());

    // 80 g + 200 g of the same 100 g densities.
    expect(totals.calories).toBeCloseTo(462);
    expect(totals.protein).toBeCloseTo(88.2);
    expect(totals.carbs).toBeCloseTo(0);
    expect(totals.fat).toBeCloseTo(10.08);
  });

  test("sums across items that reference different ingredients", () => {
    const oats = makeIngredient({
      id: "oats",
      name: "Oats",
      caloriesPer100g: 389,
      proteinPer100g: 17,
      carbsPer100g: 66,
      fatPer100g: 7,
    });
    const milk = makeIngredient({
      id: "milk",
      name: "Whole milk",
      caloriesPer100g: 42,
      proteinPer100g: 3.5,
      carbsPer100g: 5,
      fatPer100g: 1,
    });

    const totals = computeMealTotals(
      makeMeal({ items: [item(oats, 50, 0), item(milk, 150, 1)] }),
    );

    expect(totals).toEqual({
      calories: 257.5,
      protein: 13.75,
      carbs: 40.5,
      fat: 5,
    });
  });
});

describe("sumMealItems", () => {
  test("returns all zeroes for an empty list", () => {
    expect(sumMealItems([])).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  test("scales a single item's densities by its grams", () => {
    const chicken = makeIngredient();

    expect(sumMealItems([{ grams: 50, ingredient: chicken }])).toEqual({
      calories: 82.5,
      protein: 15.75,
      carbs: 0,
      fat: 1.8,
    });
  });

  test("sums across items that reference different ingredients", () => {
    const oats = makeIngredient({
      id: "oats",
      name: "Oats",
      caloriesPer100g: 389,
      proteinPer100g: 17,
      carbsPer100g: 66,
      fatPer100g: 7,
    });
    const milk = makeIngredient({
      id: "milk",
      name: "Whole milk",
      caloriesPer100g: 42,
      proteinPer100g: 3.5,
      carbsPer100g: 5,
      fatPer100g: 1,
    });

    expect(
      sumMealItems([
        { grams: 50, ingredient: oats },
        { grams: 150, ingredient: milk },
      ]),
    ).toEqual({
      calories: 257.5,
      protein: 13.75,
      carbs: 40.5,
      fat: 5,
    });
  });
});
