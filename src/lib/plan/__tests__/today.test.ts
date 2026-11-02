import { describe, expect, test } from "vitest";

import {
  budgetBarGeometry,
  summarizeDay,
  withMealEaten,
} from "@/lib/plan/today";
import type { PlannedMealView } from "@/lib/plan/types";
import {
  macroBudgetDefaults,
  makeDayColumn,
  makePlannedMealView,
  makeSlotView,
} from "@test/factories";

/** A meal delivering exactly `calories`, with protein at a tenth of that. */
function meal(id: string, calories: number, eaten = false): PlannedMealView {
  return makePlannedMealView({
    id,
    eaten,
    totals: { calories, protein: calories / 10, carbs: 0, fat: 0 },
  });
}

/** A day with the given meals, in one slot, and a 2200 kcal budget. */
function day(...meals: PlannedMealView[]) {
  return makeDayColumn({ slots: [makeSlotView({ meals })] });
}

describe("summarizeDay", () => {
  test("counts nothing as eaten until a meal is ticked", () => {
    const summary = summarizeDay(day(meal("a", 500), meal("b", 700)));

    expect(summary.eaten.calories).toBe(0);
    expect(summary.stillPlanned.calories).toBe(1200);
    expect(summary.caloriesLeft).toBe(2200);
  });

  test("only ticked meals reduce what's left", () => {
    const summary = summarizeDay(day(meal("a", 500, true), meal("b", 700)));

    expect(summary.eaten).toMatchObject({ calories: 500, protein: 50 });
    expect(summary.stillPlanned).toMatchObject({ calories: 700, protein: 70 });
    expect(summary.caloriesLeft).toBe(1700);
  });

  test("leaves nothing still planned once everything is eaten", () => {
    const summary = summarizeDay(day(meal("a", 500, true)));

    expect(summary.stillPlanned.calories).toBe(0);
  });

  test("goes negative when over budget", () => {
    const summary = summarizeDay(day(meal("a", 2320, true)));

    expect(summary.caloriesLeft).toBe(-120);
  });

  test("counts each copy of a template planned twice", () => {
    const summary = summarizeDay(day(meal("a", 300, true), meal("b", 300)));

    expect(summary.eaten.calories).toBe(300);
    expect(summary.stillPlanned.calories).toBe(300);
  });

  test("adds meals across slots", () => {
    const summary = summarizeDay(
      makeDayColumn({
        slots: [
          makeSlotView({ id: "s1", meals: [meal("a", 100, true)] }),
          makeSlotView({ id: "s2", meals: [meal("b", 200, true)] }),
        ],
      }),
    );

    expect(summary.eaten.calories).toBe(300);
  });

  test("rounds what's left to a whole number", () => {
    const summary = summarizeDay(day(meal("a", 100.6, true)));

    expect(summary.caloriesLeft).toBe(2099);
  });

  test("treats a day with no budget as a zero target", () => {
    const summary = summarizeDay(makeDayColumn({ budget: null }));

    expect(summary.targetCalories).toBe(0);
    expect(summary.caloriesLeft).toBe(0);
  });

  test("uses the day's budget as the target", () => {
    expect(summarizeDay(day()).targetCalories).toBe(
      macroBudgetDefaults.calories,
    );
  });
});

describe("budgetBarGeometry", () => {
  test("sizes the zones against the target while under it", () => {
    expect(budgetBarGeometry(500, 500, 2000)).toEqual({
      eatenPercent: 25,
      plannedPercent: 25,
    });
  });

  test("scales to the day's total when the plan overshoots", () => {
    expect(budgetBarGeometry(1000, 3000, 2000)).toEqual({
      eatenPercent: 25,
      plannedPercent: 75,
    });
  });

  test("draws nothing with a zero scale", () => {
    expect(budgetBarGeometry(0, 0, 0)).toEqual({
      eatenPercent: 0,
      plannedPercent: 0,
    });
  });

  test("fills the bar from a day planned with no target", () => {
    expect(budgetBarGeometry(100, 0, 0).eatenPercent).toBe(100);
  });
});

describe("withMealEaten", () => {
  test("changes only the matching meal", () => {
    const next = withMealEaten(day(meal("a", 1), meal("b", 2)), "b", true);

    expect(next.slots[0].meals.map((m) => m.eaten)).toEqual([false, true]);
  });

  test("leaves the original day untouched", () => {
    const original = day(meal("a", 1));

    withMealEaten(original, "a", true);

    expect(original.slots[0].meals[0].eaten).toBe(false);
  });

  test("ignores an unknown id", () => {
    const next = withMealEaten(day(meal("a", 1)), "nope", true);

    expect(next.slots[0].meals[0].eaten).toBe(false);
  });
});
