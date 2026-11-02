import { describe, expect, test } from "vitest";

import {
  barGeometry,
  dayTotals,
  calorieStateLabel,
  groupPlannedMeals,
  macroState,
  MACRO_TOLERANCE,
  overLabel,
  slotTotals,
  stateLabel,
  stateMarker,
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

describe("macroState rounding", () => {
  test("counts a gap that rounds away as met, even on a small target", () => {
    expect(macroState(4.6, 5).state).toBe("met");
    expect(macroState(0.4, 0).state).toBe("met");
  });

  test("still counts a gap that survives rounding", () => {
    expect(macroState(4.4, 5).state).toBe("short");
    expect(macroState(0.5, 0).state).toBe("over");
  });
});

describe("stateMarker", () => {
  test("ticks a met plan", () => {
    expect(stateMarker(60, 60)).toBe("✓");
  });

  test("signs the gap of a short or over plan", () => {
    expect(stateMarker(40, 60)).toBe("−20");
    expect(stateMarker(80, 60)).toBe("+20");
  });

  test("takes the gap between the rounded values shown beside it", () => {
    // 46.5 shows as 47, so 62 reads as 15 short, not the raw gap's 16.
    expect(stateMarker(46.5, 62)).toBe("−15");
  });

  test("marks any plan against a zero target as over", () => {
    expect(stateMarker(50, 0)).toBe("+50");
  });

  test("never shows a signed zero", () => {
    expect(stateMarker(4.6, 5)).toBe("✓");
  });
});

describe("calorieStateLabel", () => {
  test("spells out each state", () => {
    expect(calorieStateLabel(2000, 2000)).toBe("On target");
    expect(calorieStateLabel(1500, 2000)).toBe("500 kcal short of target");
    expect(calorieStateLabel(2500, 2000)).toBe("500 kcal over target");
  });

  test("handles a zero target", () => {
    expect(calorieStateLabel(0, 0)).toBe("On target");
    expect(calorieStateLabel(100, 0)).toBe("100 kcal over target");
  });
});

describe("groupPlannedMeals", () => {
  const totals = { calories: 100.5, protein: 0, carbs: 0, fat: 0 };

  test("folds copies of a template and sums their kcal", () => {
    expect(
      groupPlannedMeals([
        { mealId: "a", name: "Oats", totals },
        { mealId: "a", name: "Oats", totals },
      ]),
    ).toEqual([{ mealId: "a", name: "Oats", count: 2, calories: 201 }]);
  });

  test("keeps first-planned order across templates", () => {
    const groups = groupPlannedMeals([
      { mealId: "b", name: "Eggs", totals },
      { mealId: "a", name: "Oats", totals },
      { mealId: "b", name: "Eggs", totals },
    ]);

    expect(groups.map((group) => group.mealId)).toEqual(["b", "a"]);
  });

  test("returns nothing for an empty slot", () => {
    expect(groupPlannedMeals([])).toEqual([]);
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
      "Carbs: 47 of 62 g, 15 g short",
    );
  });

  test("spells out an over macro with the excess grams", () => {
    expect(stateLabel("over", "fat", 70, 62)).toBe("Fat: 70 of 62 g, 8 g over");
  });
});

describe("barGeometry", () => {
  test("draws no fill for an empty plan", () => {
    expect(barGeometry(0, 100)).toEqual({ fillPercent: 0 });
  });

  test("fills the row when the plan equals the target", () => {
    expect(barGeometry(100, 100)).toEqual({ fillPercent: 100 });
  });

  test("fills the row when the plan is over the target", () => {
    expect(barGeometry(150, 100)).toEqual({ fillPercent: 100 });
  });

  test("fills the row for a heavily overshot plan", () => {
    expect(barGeometry(1000, 100)).toEqual({ fillPercent: 100 });
  });

  test("fills the row for a plan against a zero target", () => {
    expect(barGeometry(50, 0)).toEqual({ fillPercent: 100 });
  });

  test("draws nothing for a zero plan and a zero target", () => {
    expect(barGeometry(0, 0)).toEqual({ fillPercent: 0 });
  });

  test("handles fractional amounts", () => {
    expect(barGeometry(2.5, 5)).toEqual({ fillPercent: 50 });
  });
});

describe("overLabel", () => {
  test("rounds the excess to a whole number", () => {
    expect(overLabel(900.4, 840.2)).toBe("60 kcal over target");
  });

  test("is null inside the tolerance band", () => {
    expect(overLabel(100, 100)).toBeNull();
    expect(overLabel(95, 100)).toBeNull();
    expect(overLabel(105, 100)).toBeNull();
  });

  test("is null exactly at the band boundary", () => {
    expect(overLabel(105, 100)).toBeNull();
  });

  test("spells the excess out just past the band", () => {
    expect(overLabel(106, 100)).toBe("6 kcal over target");
  });

  test("spells the excess out far past the band", () => {
    expect(overLabel(900, 840)).toBe("60 kcal over target");
  });

  test("marks any plan against a zero target as over", () => {
    expect(overLabel(50, 0)).toBe("50 kcal over target");
  });

  test("leaves an empty plan against a zero target alone", () => {
    expect(overLabel(0, 0)).toBeNull();
  });
});
