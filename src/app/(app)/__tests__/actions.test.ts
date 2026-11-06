import { refresh } from "next/cache";

import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  markTutorialSeenAction,
  setMealEatenAction,
  swapMealAction,
} from "@/app/(app)/actions";
import { requireUser } from "@/lib/auth/session";
import { addDays, todayKey } from "@/lib/calendar/week";
import { PlanTargetNotFoundError } from "@/lib/plan/errors";
import {
  initialSetMealEatenState,
  initialSwapMealState,
} from "@/lib/plan/form-state";
import {
  getPlannedMeal,
  setPlanMealEaten,
  swapPlannedMeal,
} from "@/lib/plan/repository";
import { markTutorialSeen } from "@/lib/tutorial/repository";
import {
  makePlannedMeal,
  makeSetMealEatenFormData,
  makeSwapMealFormData,
  testUser,
} from "@test/factories";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/plan/repository", () => ({
  getPlannedMeal: vi.fn(),
  setPlanMealEaten: vi.fn(),
  swapPlannedMeal: vi.fn(),
}));
vi.mock("@/lib/tutorial/repository", () => ({ markTutorialSeen: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));

const PLAN_ID = "9f1c1f9e-0000-4000-8000-000000000030";
const MEAL_ID = "9f1c1f9e-0000-4000-8000-000000000020";

/** A valid tick. */
const tick = () =>
  makeSetMealEatenFormData({ planMealId: PLAN_ID, eaten: "true" });

/** A valid swap. */
const swap = () =>
  makeSwapMealFormData({
    planMealId: PLAN_ID,
    mealId: MEAL_ID,
    mealName: "Salmon",
  });

/** A stored plan for today, overridable field by field. */
const plan = (overrides = {}) =>
  makePlannedMeal({ id: PLAN_ID, date: todayKey(), ...overrides });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(requireUser).mockResolvedValue(testUser);
});

describe("setMealEatenAction", () => {
  test("stops at the sign-in redirect before touching the plan", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireUser).mockRejectedValue(redirect);

    await expect(
      setMealEatenAction(initialSetMealEatenState, tick()),
    ).rejects.toBe(redirect);
    expect(getPlannedMeal).not.toHaveBeenCalled();
  });

  test("saves a tick and refreshes", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(plan());

    const state = await setMealEatenAction(initialSetMealEatenState, tick());

    expect(state).toEqual({ status: "success" });
    expect(getPlannedMeal).toHaveBeenCalledWith(testUser.id, PLAN_ID);
    expect(setPlanMealEaten).toHaveBeenCalledWith(testUser.id, PLAN_ID, true);
    expect(refresh).toHaveBeenCalledOnce();
  });

  test("saves an untick", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(plan({ eaten: true }));

    await setMealEatenAction(
      initialSetMealEatenState,
      makeSetMealEatenFormData({ planMealId: PLAN_ID, eaten: "false" }),
    );

    expect(setPlanMealEaten).toHaveBeenCalledWith(testUser.id, PLAN_ID, false);
  });

  test.each([
    ["a past day", -1],
    ["a future day", 1],
  ])("refuses a meal on %s", async (_name, offset) => {
    vi.mocked(getPlannedMeal).mockResolvedValue(
      plan({ date: addDays(todayKey(), offset) }),
    );

    const state = await setMealEatenAction(initialSetMealEatenState, tick());

    expect(state.status).toBe("error");
    expect(state.formError).toMatch(/only today/i);
    expect(setPlanMealEaten).not.toHaveBeenCalled();
  });

  test.each([
    ["a malformed id", { planMealId: "nope", eaten: "true" }],
    ["a malformed state", { planMealId: PLAN_ID, eaten: "maybe" }],
    ["a missing state", { planMealId: PLAN_ID, eaten: null }],
  ])("rejects %s", async (_name, values) => {
    const state = await setMealEatenAction(
      initialSetMealEatenState,
      makeSetMealEatenFormData(values),
    );

    expect(state.status).toBe("error");
    expect(getPlannedMeal).not.toHaveBeenCalled();
  });

  test("reports a plan that vanished or isn't the user's", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(null);

    const state = await setMealEatenAction(initialSetMealEatenState, tick());

    expect(state.formError).toMatch(/no longer exists/);
    expect(setPlanMealEaten).not.toHaveBeenCalled();
  });

  test("reports a failed write without refreshing", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(plan());
    vi.mocked(setPlanMealEaten).mockRejectedValue(new Error("db down"));

    const state = await setMealEatenAction(initialSetMealEatenState, tick());

    expect(state.formError).toMatch(/try again/);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("swapMealAction", () => {
  test("stops at the sign-in redirect before touching the plan", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireUser).mockRejectedValue(redirect);

    await expect(swapMealAction(initialSwapMealState, swap())).rejects.toBe(
      redirect,
    );
    expect(getPlannedMeal).not.toHaveBeenCalled();
  });

  test("swaps the meal, refreshes and echoes the new name", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(plan());

    const state = await swapMealAction(initialSwapMealState, swap());

    expect(state).toEqual({ status: "success", swappedName: "Salmon" });
    expect(swapPlannedMeal).toHaveBeenCalledWith(testUser.id, PLAN_ID, MEAL_ID);
    expect(refresh).toHaveBeenCalledOnce();
  });

  test("refuses a ticked meal", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(plan({ eaten: true }));

    const state = await swapMealAction(initialSwapMealState, swap());

    expect(state.formError).toBe("Untick this meal before swapping it.");
    expect(swapPlannedMeal).not.toHaveBeenCalled();
  });

  test.each([
    ["a past day", -1],
    ["a future day", 1],
  ])("refuses a meal on %s", async (_name, offset) => {
    vi.mocked(getPlannedMeal).mockResolvedValue(
      plan({ date: addDays(todayKey(), offset) }),
    );

    const state = await swapMealAction(initialSwapMealState, swap());

    expect(state.formError).toMatch(/only today/i);
    expect(swapPlannedMeal).not.toHaveBeenCalled();
  });

  test("echoes an empty name when the form sent none", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(plan());

    const state = await swapMealAction(
      initialSwapMealState,
      makeSwapMealFormData({ planMealId: PLAN_ID, mealId: MEAL_ID }),
    );

    expect(state).toEqual({ status: "success", swappedName: "" });
    expect(swapPlannedMeal).toHaveBeenCalledWith(testUser.id, PLAN_ID, MEAL_ID);
  });

  test("rejects malformed ids", async () => {
    const state = await swapMealAction(
      initialSwapMealState,
      makeSwapMealFormData({ planMealId: PLAN_ID, mealId: "nope" }),
    );

    expect(state.status).toBe("error");
    expect(getPlannedMeal).not.toHaveBeenCalled();
  });

  test("reports a plan that vanished or isn't the user's", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(null);

    const state = await swapMealAction(initialSwapMealState, swap());

    expect(state.formError).toMatch(/no longer exists/);
  });

  test("reports a foreign or deleted meal", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(plan());
    vi.mocked(swapPlannedMeal).mockRejectedValue(
      new PlanTargetNotFoundError("meal", MEAL_ID),
    );

    const state = await swapMealAction(initialSwapMealState, swap());

    expect(state.formError).toBe(
      "That meal no longer exists. Reload the page.",
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  test("reports a failed write without refreshing", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(plan());
    vi.mocked(swapPlannedMeal).mockRejectedValue(new Error("db down"));

    const state = await swapMealAction(initialSwapMealState, swap());

    expect(state.formError).toMatch(/try again/);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("markTutorialSeenAction", () => {
  test("stops at the sign-in redirect before writing", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireUser).mockRejectedValue(redirect);

    await expect(markTutorialSeenAction()).rejects.toBe(redirect);
    expect(markTutorialSeen).not.toHaveBeenCalled();
  });

  test("records the tutorial as seen for the signed-in user", async () => {
    await markTutorialSeenAction();

    expect(markTutorialSeen).toHaveBeenCalledWith(testUser.id);
  });

  test("only logs a failed save", async () => {
    vi.mocked(markTutorialSeen).mockRejectedValue(new Error("db down"));

    await expect(markTutorialSeenAction()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledOnce();
  });
});
