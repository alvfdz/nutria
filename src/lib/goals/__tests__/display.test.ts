import { describe, expect, test } from "vitest";

import {
  formatWhole,
  percentTotalStatus,
  removedMealWarning,
  saveBlockerMessage,
} from "@/lib/goals/display";

describe("formatWhole", () => {
  test("rounds to the nearest integer", () => {
    expect(formatWhole(66.67)).toBe("67");
    expect(formatWhole(187.5)).toBe("188");
    expect(formatWhole(20)).toBe("20");
    expect(formatWhole(0)).toBe("0");
  });
});

describe("percentTotalStatus", () => {
  test("accepts an exact total", () => {
    expect(percentTotalStatus("Macros", 100)).toEqual({
      valid: true,
      message: "Macros total 100%",
    });
  });

  test("accepts rounding drift the schema also accepts", () => {
    expect(percentTotalStatus("Meals", 99.99)).toEqual({
      valid: true,
      message: "Meals total 100%",
    });
    expect(percentTotalStatus("Meals", 100.5).valid).toBe(true);
  });

  test("says how much to add when the total falls short", () => {
    expect(percentTotalStatus("Macros", 95)).toEqual({
      valid: false,
      message: "Macros total 95% — add 5% to reach 100%",
    });
  });

  test("says how much to remove when the total runs over", () => {
    expect(percentTotalStatus("Meals", 150)).toEqual({
      valid: false,
      message: "Meals total 150% — remove 50% to reach 100%",
    });
  });

  test("keeps the decimals of a total just outside the tolerance", () => {
    expect(percentTotalStatus("Macros", 100.6)).toEqual({
      valid: false,
      message: "Macros total 100.6% — remove 0.6% to reach 100%",
    });
  });

  test("handles an empty form", () => {
    expect(percentTotalStatus("Macros", 0).message).toBe(
      "Macros total 0% — add 100% to reach 100%",
    );
  });
});

describe("removedMealWarning", () => {
  test("says nothing for a meal without plans", () => {
    expect(removedMealWarning("Lunch", undefined)).toBeNull();
    expect(
      removedMealWarning("Lunch", { upcomingDays: [], hasPastPlans: false }),
    ).toBeNull();
  });

  test("blocks the save and names the upcoming days", () => {
    expect(
      removedMealWarning("Lunch", {
        upcomingDays: ["2026-10-13", "2026-10-14"],
        hasPastPlans: true,
      }),
    ).toBe(
      "Lunch has planned meals on Tue 13, Wed 14. Remove those plans from the calendar to save this change, or reset to keep the meal.",
    );
  });

  test("summarizes the days past the first three", () => {
    const warning = removedMealWarning("Lunch", {
      upcomingDays: [
        "2026-10-13",
        "2026-10-14",
        "2026-10-15",
        "2026-10-16",
        "2026-10-17",
      ],
      hasPastPlans: false,
    });

    expect(warning).toContain("Tue 13, Wed 14, Thu 15 and 2 more.");
  });

  test("warns when only past plans would be deleted", () => {
    expect(
      removedMealWarning("Lunch", { upcomingDays: [], hasPastPlans: true }),
    ).toBe("Saving also deletes the past plans for Lunch.");
  });
});

describe("saveBlockerMessage", () => {
  test("is empty when both totals are valid", () => {
    expect(saveBlockerMessage(true, true)).toBeNull();
  });

  test("names whichever total is wrong", () => {
    expect(saveBlockerMessage(false, true)).toBe("Fix the macro total to save");
    expect(saveBlockerMessage(true, false)).toBe("Fix the meal total to save");
    expect(saveBlockerMessage(false, false)).toBe(
      "Fix the macro and meal totals to save",
    );
  });
});
