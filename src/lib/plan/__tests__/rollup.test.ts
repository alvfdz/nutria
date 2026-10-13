import { describe, expect, test } from "vitest";

import {
  dayTotals,
  macroState,
  MACRO_TOLERANCE,
  slotTotals,
  stateLabel,
  sumTotals,
} from "@/lib/plan/rollup";
import type { MealTotals } from "@/lib/meals/macros";
import { makeMeal } from "@test/factories";

/** A totals row with the three macros and calories set independently. */
function totals(overrides: Partial<MealTotals> = {}): MealTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, ...overrides };
}

describe("sumTotals", () => {
  test("adds every field of every entry", () => {
    const result = sumTotals([
      totals({ calories: 100, protein: 10, carbs: 20, fat: 5 }),
      totals({ calories: 250, protein: 30, carbs: 15, fat: 8 }),
    ]);

    expect(result).toEqual({ calories: 350, protein: 40, carbs: 35, fat: 13 });
  });

  test("returns zeroes for an empty list", () => {
    expect(sumTotals([])).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

describe("slotTotals", () => {
  test("computes each meal live and sums them", () => {
    const meal = makeMeal();
    const other = makeMeal({ id: "meal-2" });

    // The default meal is 80 g oats + 200 g milk; doubling it doubles totals.
    expect(slotTotals([meal, other])).toEqual(
      sumTotals([slotTotals([meal]), slotTotals([other])]),
    );
  });

  test("returns zeroes when nothing is planned", () => {
    expect(slotTotals([])).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

describe("dayTotals", () => {
  test("sums every slot's planned meals", () => {
    const meal = makeMeal();

    expect(dayTotals([{ meals: [meal] }, { meals: [meal] }])).toEqual(
      slotTotals([meal, meal]),
    );
  });

  test("treats empty slots as zero", () => {
    expect(dayTotals([{ meals: [] }, { meals: [] }])).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

describe("macroState", () => {
  test("is met exactly on target", () => {
    expect(macroState(100, 100)).toEqual({ state: "met", delta: 0 });
  });

  test("is met within the tolerance band on both sides", () => {
    // 5% of 100 is 5, so 95 and 105 are the inclusive boundary.
    expect(macroState(95, 100).state).toBe("met");
    expect(macroState(105, 100).state).toBe("met");
    expect(MACRO_TOLERANCE).toBe(0.05);
  });

  test("is short just below the band and reports the gap", () => {
    expect(macroState(94, 100)).toEqual({ state: "short", delta: -6 });
  });

  test("is over just above the band and reports the gap", () => {
    expect(macroState(106, 100)).toEqual({ state: "over", delta: 6 });
  });

  test("a zero target met by an empty plan is met", () => {
    expect(macroState(0, 0)).toEqual({ state: "met", delta: 0 });
  });

  test("a zero target exceeded by any plan is over", () => {
    expect(macroState(0.5, 0)).toEqual({ state: "over", delta: 0.5 });
  });

  test("handles a fractional target", () => {
    // 5% of 60 is 3, so 57 through 63 are met.
    expect(macroState(57, 60).state).toBe("met");
    expect(macroState(56.9, 60).state).toBe("short");
    expect(macroState(63, 60).state).toBe("met");
    expect(macroState(63.1, 60).state).toBe("over");
  });
});

describe("stateLabel", () => {
  test("spells out an on-target macro", () => {
    expect(stateLabel("met", "protein", 60, 60)).toBe(
      "Protein: 60 of 60 g, on target",
    );
  });

  test("spells out a short macro with the missing grams", () => {
    expect(stateLabel("short", "carbs", 46.8, 62)).toBe(
      "Carbs: 46.8 of 62 g, 15.2 g short",
    );
  });

  test("spells out an over macro with the excess grams", () => {
    expect(stateLabel("over", "fat", 70, 62)).toBe("Fat: 70 of 62 g, 8 g over");
  });
});
