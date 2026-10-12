import { describe, expect, test } from "vitest";

import {
  computeMacroBudget,
  computeSlotBudget,
  computeSlotBudgets,
} from "@/lib/goals/budget";
import { goalsDefaults } from "@test/factories";

describe("computeMacroBudget", () => {
  test("turns 2000 kcal at 30/40/30 into the classic gram split", () => {
    const budget = computeMacroBudget({
      calories: 2000,
      proteinPct: 30,
      carbsPct: 40,
      fatPct: 30,
    });

    // Protein and carbs yield ~4 kcal/g, fat ~9 kcal/g.
    expect(budget.calories).toBe(2000);
    expect(budget.proteinGrams).toBe(150);
    expect(budget.carbsGrams).toBe(200);
    expect(budget.fatGrams).toBeCloseTo(66.6666667);
  });

  test("scales the grams with the calorie target", () => {
    const budget = computeMacroBudget({
      calories: 2500,
      proteinPct: 40,
      carbsPct: 40,
      fatPct: 20,
    });

    expect(budget.proteinGrams).toBe(250);
    expect(budget.carbsGrams).toBe(250);
    expect(budget.fatGrams).toBeCloseTo(55.5555556);
  });

  test("handles whole and decimal shares", () => {
    const budget = computeMacroBudget({
      calories: 1000,
      proteinPct: 33.33,
      carbsPct: 33.33,
      fatPct: 33.34,
    });

    expect(budget.proteinGrams).toBeCloseTo(83.325);
    expect(budget.carbsGrams).toBeCloseTo(83.325);
    expect(budget.fatGrams).toBeCloseTo(37.0444444);
  });
});

describe("computeSlotBudget", () => {
  test("slices the daily grams by the meal's percentage", () => {
    // Lunch gets 40% of a 2000 kcal / 30/40/30 day.
    const budget = computeSlotBudget(
      { calories: 2000, proteinPct: 30, carbsPct: 40, fatPct: 30 },
      40,
    );

    expect(budget.calories).toBe(800);
    expect(budget.proteinGrams).toBe(60);
    expect(budget.carbsGrams).toBe(80);
    expect(budget.fatGrams).toBeCloseTo(26.6666667);
  });

  test("a zero-percent slot gets nothing", () => {
    const budget = computeSlotBudget(
      { calories: 2000, proteinPct: 30, carbsPct: 40, fatPct: 30 },
      0,
    );

    expect(budget).toEqual({
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    });
  });

  test("the full 100% slice equals the whole day", () => {
    const daily = computeMacroBudget({
      calories: 2000,
      proteinPct: 30,
      carbsPct: 40,
      fatPct: 30,
    });
    const whole = computeSlotBudget(
      { calories: 2000, proteinPct: 30, carbsPct: 40, fatPct: 30 },
      100,
    );

    expect(whole.calories).toBe(daily.calories);
    expect(whole.proteinGrams).toBe(daily.proteinGrams);
    expect(whole.carbsGrams).toBe(daily.carbsGrams);
    expect(whole.fatGrams).toBeCloseTo(daily.fatGrams);
  });
});

describe("computeSlotBudgets", () => {
  test("computes one slice per slot, in the given order", () => {
    const budgets = computeSlotBudgets(
      { calories: 2000, proteinPct: 30, carbsPct: 40, fatPct: 30 },
      goalsDefaults.slots.map((slot) => ({ percent: slot.percent })),
    );

    expect(budgets).toHaveLength(3);
    expect(budgets.map((budget) => budget.calories)).toEqual([600, 800, 600]);
    expect(budgets.map((budget) => budget.proteinGrams)).toEqual([45, 60, 45]);
    expect(budgets.map((budget) => budget.carbsGrams)).toEqual([60, 80, 60]);
    // Fat follows the 40% lunch slot: 66.67 × 0.4 ≈ 26.67.
    const expectedFat = [20, 26.6666667, 20];
    budgets.forEach((budget, index) =>
      expect(budget.fatGrams).toBeCloseTo(expectedFat[index]),
    );
  });

  test("returns an empty list for no slots", () => {
    expect(
      computeSlotBudgets(
        { calories: 2000, proteinPct: 30, carbsPct: 40, fatPct: 30 },
        [],
      ),
    ).toEqual([]);
  });
});
