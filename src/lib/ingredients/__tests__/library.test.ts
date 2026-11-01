import { describe, expect, test } from "vitest";

import {
  filterIngredients,
  formatMealList,
  macroCalorieShares,
  nextSort,
  sortIngredients,
} from "@/lib/ingredients/library";
import { makeIngredient } from "@test/factories";

const oats = makeIngredient({
  id: "oats",
  name: "Rolled oats",
  proteinPer100g: 13,
});
const ham = makeIngredient({ id: "ham", name: "Jamón", proteinPer100g: 30 });
const cod = makeIngredient({ id: "cod", name: "cod", proteinPer100g: 13 });

const names = (list: { name: string }[]) => list.map(({ name }) => name);

describe("filterIngredients", () => {
  test("keeps everything for a blank query", () => {
    expect(filterIngredients([oats, ham], "   ")).toEqual([oats, ham]);
  });

  test("ignores case and surrounding space", () => {
    expect(filterIngredients([oats, ham], "  OATS ")).toEqual([oats]);
  });

  test("ignores accents in both directions", () => {
    expect(filterIngredients([oats, ham], "jamon")).toEqual([ham]);
    expect(
      filterIngredients([makeIngredient({ name: "Jamon" })], "jamón"),
    ).toHaveLength(1);
  });

  test("returns nothing when no name matches", () => {
    expect(filterIngredients([oats, ham], "tofu")).toEqual([]);
  });
});

describe("sortIngredients", () => {
  test("keeps the given order without a sort", () => {
    expect(sortIngredients([oats, ham], null)).toEqual([oats, ham]);
  });

  test("sorts names ignoring case", () => {
    expect(
      names(
        sortIngredients([oats, ham, cod], { key: "name", direction: "asc" }),
      ),
    ).toEqual(["cod", "Jamón", "Rolled oats"]);
  });

  test("sorts numbers both ways", () => {
    expect(
      names(
        sortIngredients([oats, ham], {
          key: "proteinPer100g",
          direction: "desc",
        }),
      )[0],
    ).toBe("Jamón");
    expect(
      names(
        sortIngredients([ham, oats], {
          key: "proteinPer100g",
          direction: "asc",
        }),
      )[0],
    ).toBe("Rolled oats");
  });

  test("breaks a tie by name in either direction", () => {
    for (const direction of ["asc", "desc"] as const) {
      expect(
        names(
          sortIngredients([oats, cod], { key: "proteinPer100g", direction }),
        ),
      ).toEqual(["cod", "Rolled oats"]);
    }
  });

  test("does not change the array it is given", () => {
    const list = [oats, cod];
    sortIngredients(list, { key: "name", direction: "asc" });

    expect(list).toEqual([oats, cod]);
  });
});

describe("nextSort", () => {
  test("cycles a name column A to Z, Z to A, then off", () => {
    const first = nextSort(null, "name");
    expect(first).toEqual({ key: "name", direction: "asc" });

    const second = nextSort(first, "name");
    expect(second).toEqual({ key: "name", direction: "desc" });

    expect(nextSort(second, "name")).toBeNull();
  });

  test("cycles a number column highest first, lowest first, then off", () => {
    const first = nextSort(null, "fatPer100g");
    expect(first).toEqual({ key: "fatPer100g", direction: "desc" });

    const second = nextSort(first, "fatPer100g");
    expect(second).toEqual({ key: "fatPer100g", direction: "asc" });

    expect(nextSort(second, "fatPer100g")).toBeNull();
  });

  test("starts over when another column is clicked", () => {
    expect(
      nextSort({ key: "name", direction: "desc" }, "carbsPer100g"),
    ).toEqual({ key: "carbsPer100g", direction: "desc" });
  });
});

describe("macroCalorieShares", () => {
  test("weighs fat at 9 kcal/g against 4 for protein and carbs", () => {
    expect(
      macroCalorieShares({
        proteinPer100g: 9,
        carbsPer100g: 0,
        fatPer100g: 4,
      }),
    ).toEqual({ proteinPct: 50, carbsPct: 0, fatPct: 50 });
  });

  test("gives a single-macro food the whole bar", () => {
    expect(
      macroCalorieShares({
        proteinPer100g: 0,
        carbsPer100g: 0,
        fatPer100g: 100,
      }),
    ).toEqual({ proteinPct: 0, carbsPct: 0, fatPct: 100 });
  });

  test("returns null when there are no macros", () => {
    expect(
      macroCalorieShares({ proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 }),
    ).toBeNull();
  });
});

describe("formatMealList", () => {
  test.each([
    [[], ""],
    [["Stew"], "Stew"],
    [["Stew", "Soup"], "Stew and Soup"],
    [["Stew", "Soup", "Salad"], "Stew, Soup and Salad"],
    [["Stew", "Soup", "Salad", "Rice"], "Stew, Soup, Salad and 1 more"],
    [["A", "B", "C", "D", "E"], "A, B, C and 2 more"],
  ])("formats %j", (meals, expected) => {
    expect(formatMealList(meals)).toBe(expected);
  });
});
