import { describe, expect, test } from "vitest";

import { THIN_SPACE } from "@/lib/design-system";
import { filterMeals, formatMealItems, sortMeals } from "@/lib/meals/library";
import type { Meal } from "@/lib/meals/types";
import { makeIngredient, makeMeal } from "@test/factories";

const oats = makeIngredient({
  id: "oats",
  name: "Rolled oats",
  caloriesPer100g: 400,
  proteinPer100g: 10,
  carbsPer100g: 60,
  fatPer100g: 5,
});
const ham = makeIngredient({
  id: "ham",
  name: "Jamón",
  caloriesPer100g: 200,
  proteinPer100g: 30,
  carbsPer100g: 0,
  fatPer100g: 10,
});

/** A meal of one ingredient at the given quantity. */
function mealOf(name: string, ingredient: typeof oats, grams: number): Meal {
  return makeMeal({
    id: name,
    name,
    items: [
      {
        id: `${name}-item`,
        sortOrder: 0,
        ingredientId: ingredient.id,
        grams,
        ingredient,
      },
    ],
  });
}

const porridge = mealOf("Porridge", oats, 100);
const plate = mealOf("Cold plate", ham, 100);
const snack = mealOf("snack", ham, 100);

const names = (list: Meal[]) => list.map(({ name }) => name);

describe("filterMeals", () => {
  test("keeps everything for a blank query", () => {
    expect(filterMeals([porridge, plate], "   ")).toEqual([porridge, plate]);
  });

  test("matches the meal's name, ignoring case and space", () => {
    expect(filterMeals([porridge, plate], "  PORR ")).toEqual([porridge]);
  });

  test("matches an ingredient's name, ignoring accents", () => {
    expect(filterMeals([porridge, plate], "jamon")).toEqual([plate]);
  });

  test("returns nothing when no name matches", () => {
    expect(filterMeals([porridge, plate], "tofu")).toEqual([]);
  });
});

describe("sortMeals", () => {
  test("keeps the given order without a sort", () => {
    expect(sortMeals([plate, porridge], null)).toEqual([plate, porridge]);
  });

  test("sorts names ignoring case", () => {
    expect(
      names(
        sortMeals([snack, porridge, plate], { key: "name", direction: "asc" }),
      ),
    ).toEqual(["Cold plate", "Porridge", "snack"]);
    expect(
      names(
        sortMeals([snack, porridge, plate], { key: "name", direction: "desc" }),
      ),
    ).toEqual(["snack", "Porridge", "Cold plate"]);
  });

  test("sorts by the computed totals both ways", () => {
    expect(
      names(
        sortMeals([plate, porridge], { key: "calories", direction: "desc" }),
      ),
    ).toEqual(["Porridge", "Cold plate"]);
    expect(
      names(sortMeals([porridge, plate], { key: "protein", direction: "asc" })),
    ).toEqual(["Porridge", "Cold plate"]);
  });

  test("scales the totals by each item's quantity", () => {
    const smallPorridge = mealOf("Small porridge", oats, 10);

    expect(
      names(
        sortMeals([smallPorridge, plate], {
          key: "calories",
          direction: "desc",
        }),
      ),
    ).toEqual(["Cold plate", "Small porridge"]);
  });

  test("breaks ties by name in either direction", () => {
    for (const direction of ["asc", "desc"] as const) {
      expect(
        names(sortMeals([snack, plate], { key: "protein", direction })),
      ).toEqual(["Cold plate", "snack"]);
    }
  });

  test("leaves the given array alone", () => {
    const list = [snack, plate];

    sortMeals(list, { key: "name", direction: "asc" });
    sortMeals(list, { key: "fat", direction: "asc" });

    expect(list).toEqual([snack, plate]);
  });
});

describe("formatMealItems", () => {
  test("lists each ingredient with its quantity, in order", () => {
    const meal = makeMeal({
      items: [...porridge.items, { ...plate.items[0], grams: 12.5 }],
    });

    expect(formatMealItems(meal)).toBe(
      `Rolled oats (100${THIN_SPACE}g), Jamón (12.5${THIN_SPACE}g)`,
    );
  });

  test("is empty for a meal with no items", () => {
    expect(formatMealItems({ items: [] })).toBe("");
  });
});
