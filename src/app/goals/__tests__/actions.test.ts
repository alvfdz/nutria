import { refresh } from "next/cache";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { saveGoalsAction } from "@/app/goals/actions";
import { initialGoalsFormState } from "@/lib/goals/form-state";
import { saveGoals } from "@/lib/goals/repository";
import {
  goalsDefaults,
  makeGoalsFormData,
  makeValidGoalsFormData,
} from "@test/factories";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/goals/repository", () => ({ saveGoals: vi.fn() }));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveGoalsAction", () => {
  test("stores the parsed values and reports a success", async () => {
    vi.mocked(saveGoals).mockResolvedValue({
      ...goalsDefaults,
      id: "goals-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      slots: goalsDefaults.slots.map((slot, index) => ({
        ...slot,
        id: `meal-slot-${index + 1}`,
        sortOrder: index,
      })),
    });

    const state = await saveGoalsAction(
      initialGoalsFormState,
      makeValidGoalsFormData({
        calories: " 2200 ",
        proteinPct: " 30 ",
        carbsPct: "40",
        fatPct: "30",
      }),
    );

    expect(saveGoals).toHaveBeenCalledWith({
      calories: 2200,
      proteinPct: 30,
      carbsPct: 40,
      fatPct: 30,
      slots: goalsDefaults.slots,
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({
      status: "success",
      resetKey: 1,
      savedMessage: "Goals saved.",
    });
  });

  test("bumps the reset key relative to the previous state", async () => {
    vi.mocked(saveGoals).mockResolvedValue({
      ...goalsDefaults,
      id: "goals-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      slots: goalsDefaults.slots.map((slot, index) => ({
        ...slot,
        id: `meal-slot-${index + 1}`,
        sortOrder: index,
      })),
    });

    const state = await saveGoalsAction(
      { ...initialGoalsFormState, resetKey: 7 },
      makeValidGoalsFormData(),
    );

    expect(state.resetKey).toBe(8);
  });

  test("returns field errors and never touches the repository", async () => {
    const state = await saveGoalsAction(
      initialGoalsFormState,
      makeValidGoalsFormData({ calories: "0", proteinPct: "  " }),
    );

    expect(state.status).toBe("error");
    expect(state.formError).toBeUndefined();
    expect(state.fieldErrors).toMatchObject({
      calories: ["Calories must be at least 1"],
      proteinPct: ["Protein is required"],
    });
    expect(saveGoals).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("reports a sum violation as a form error", async () => {
    const state = await saveGoalsAction(
      initialGoalsFormState,
      makeValidGoalsFormData({
        proteinPct: "70",
        carbsPct: "40",
        fatPct: "30",
      }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: {},
      formError: "Protein, carbs and fat must add up to 100% (currently 140%)",
    });
    expect(saveGoals).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(saveGoals).mockRejectedValue(new Error("database down"));

    const state = await saveGoalsAction(
      initialGoalsFormState,
      makeValidGoalsFormData(),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The goals could not be saved. Please try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  test("maps a slot row missing its half onto the right index", async () => {
    const state = await saveGoalsAction(
      initialGoalsFormState,
      makeGoalsFormData(
        {
          calories: String(goalsDefaults.calories),
          proteinPct: String(goalsDefaults.proteinPct),
          carbsPct: String(goalsDefaults.carbsPct),
          fatPct: String(goalsDefaults.fatPct),
        },
        [
          { name: "Breakfast", percent: "100" },
          { name: "Lunch", percent: null },
        ],
      ),
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors).toMatchObject({
      "slots.1.percent": ["Meal share is required"],
    });
    expect(saveGoals).not.toHaveBeenCalled();
  });
});
