import { describe, expect, test } from "vitest";

import {
  compareNames,
  macroCalorieShares,
  nextSort,
  normalizeSearchText,
} from "@/lib/library";

type Column = "name" | "fat" | "carbs";

describe("normalizeSearchText", () => {
  test("drops case, accents and surrounding space", () => {
    expect(normalizeSearchText("  JAMÓN ")).toBe("jamon");
  });

  test("leaves nothing of a blank string", () => {
    expect(normalizeSearchText("   ")).toBe("");
  });
});

describe("compareNames", () => {
  test("ignores case", () => {
    expect(compareNames("cod", "Ham")).toBeLessThan(0);
    expect(compareNames("Cod", "cod")).toBe(0);
  });

  test("ignores accents", () => {
    expect(compareNames("Jamón", "Jamon")).toBe(0);
  });
});

describe("nextSort", () => {
  test("cycles a name column from A to Z, to Z to A, to newest first", () => {
    const first = nextSort<Column>(null, "name");
    expect(first).toEqual({ key: "name", direction: "asc" });

    const second = nextSort<Column>(first, "name");
    expect(second).toEqual({ key: "name", direction: "desc" });

    expect(nextSort<Column>(second, "name")).toBeNull();
  });

  test("cycles a number column from highest first", () => {
    const first = nextSort<Column>(null, "fat");
    expect(first).toEqual({ key: "fat", direction: "desc" });

    const second = nextSort<Column>(first, "fat");
    expect(second).toEqual({ key: "fat", direction: "asc" });

    expect(nextSort<Column>(second, "fat")).toBeNull();
  });

  test("starts over when another column is clicked", () => {
    expect(
      nextSort<Column>({ key: "name", direction: "desc" }, "carbs"),
    ).toEqual({ key: "carbs", direction: "desc" });
  });
});

describe("macroCalorieShares", () => {
  test("weighs fat at 9 kcal/g against 4 for protein and carbs", () => {
    expect(macroCalorieShares({ protein: 9, carbs: 0, fat: 4 })).toEqual({
      proteinPct: 50,
      carbsPct: 0,
      fatPct: 50,
    });
  });

  test("gives a single-macro food the whole bar", () => {
    expect(macroCalorieShares({ protein: 0, carbs: 0, fat: 100 })).toEqual({
      proteinPct: 0,
      carbsPct: 0,
      fatPct: 100,
    });
  });

  test("returns null when there are no macros", () => {
    expect(macroCalorieShares({ protein: 0, carbs: 0, fat: 0 })).toBeNull();
  });
});
