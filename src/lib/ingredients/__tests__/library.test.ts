import { describe, expect, test } from "vitest";

import {
  filterIngredients,
  formatMealList,
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
