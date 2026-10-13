import { refresh } from "next/cache";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { assignMealAction, removeMealAction } from "@/app/calendar/actions";
import { addDays, dbDateFromKey, todayKey } from "@/lib/calendar/week";
import { AlreadyPlannedError } from "@/lib/plan/errors";
import {
  initialAssignMealState,
  initialRemoveMealState,
} from "@/lib/plan/form-state";
import {
  assignMeal,
  getPlannedMeal,
  removePlannedMeal,
} from "@/lib/plan/repository";
import {
  makeAssignMealFormData,
  makeMeal,
  makePlannedMeal,
  makeRemoveMealFormData,
} from "@test/factories";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/plan/repository", () => ({
  assignMeal: vi.fn(),
  getPlannedMeal: vi.fn(),
  removePlannedMeal: vi.fn(),
}));

const SLOT_ID = "9f1c1f9e-0000-4000-8000-000000000010";
const MEAL_ID = "9f1c1f9e-0000-4000-8000-000000000020";
const PLAN_ID = "9f1c1f9e-0000-4000-8000-000000000030";

const TOMORROW = addDays(todayKey(), 1);
const YESTERDAY = addDays(todayKey(), -1);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("assignMealAction", () => {
  test("plans the meal and echoes its name back", async () => {
    vi.mocked(assignMeal).mockResolvedValue(undefined);

    const state = await assignMealAction(
      initialAssignMealState,
      makeAssignMealFormData({
        date: TOMORROW,
        mealSlotId: SLOT_ID,
        mealId: MEAL_ID,
        mealName: "Porridge",
      }),
    );

    expect(assignMeal).toHaveBeenCalledWith(
      dbDateFromKey(TOMORROW),
      SLOT_ID,
      MEAL_ID,
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ status: "success", assignedName: "Porridge" });
  });

  test("refuses a day that has already passed", async () => {
    const state = await assignMealAction(
      initialAssignMealState,
      makeAssignMealFormData({
        date: YESTERDAY,
        mealSlotId: SLOT_ID,
        mealId: MEAL_ID,
      }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError:
        "That day has passed. Plans can only be changed for today or later.",
    });
    expect(assignMeal).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("reports field errors for an invalid submission", async () => {
    const state = await assignMealAction(
      initialAssignMealState,
      makeAssignMealFormData({ date: TOMORROW, mealSlotId: SLOT_ID }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "Choose a meal",
    });
    expect(assignMeal).not.toHaveBeenCalled();
  });

  test("explains a duplicate plan", async () => {
    vi.mocked(assignMeal).mockRejectedValue(new AlreadyPlannedError());

    const state = await assignMealAction(
      initialAssignMealState,
      makeAssignMealFormData({
        date: TOMORROW,
        mealSlotId: SLOT_ID,
        mealId: MEAL_ID,
      }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "That meal is already planned in this slot.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(assignMeal).mockRejectedValue(new Error("database down"));

    const state = await assignMealAction(
      initialAssignMealState,
      makeAssignMealFormData({
        date: TOMORROW,
        mealSlotId: SLOT_ID,
        mealId: MEAL_ID,
      }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The meal could not be added. Please try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("removeMealAction", () => {
  test("removes the plan and echoes the meal's name", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(
      makePlannedMeal({
        id: PLAN_ID,
        date: TOMORROW,
        meal: makeMeal({ name: "Porridge" }),
      }),
    );
    vi.mocked(removePlannedMeal).mockResolvedValue(undefined);

    const state = await removeMealAction(
      initialRemoveMealState,
      makeRemoveMealFormData({ planMealId: PLAN_ID }),
    );

    expect(removePlannedMeal).toHaveBeenCalledWith(PLAN_ID);
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ status: "success", removedName: "Porridge" });
  });

  test("reports field errors for an invalid submission", async () => {
    const state = await removeMealAction(
      initialRemoveMealState,
      makeRemoveMealFormData({}),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "Choose a planned meal",
    });
    expect(removePlannedMeal).not.toHaveBeenCalled();
  });

  test("tells the user to reload when the plan has vanished", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(null);

    const state = await removeMealAction(
      initialRemoveMealState,
      makeRemoveMealFormData({ planMealId: PLAN_ID }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "That planned meal no longer exists. Reload the page.",
    });
    expect(removePlannedMeal).not.toHaveBeenCalled();
  });

  test("refuses to remove a plan on a day that has passed", async () => {
    vi.mocked(getPlannedMeal).mockResolvedValue(
      makePlannedMeal({ id: PLAN_ID, date: YESTERDAY }),
    );

    const state = await removeMealAction(
      initialRemoveMealState,
      makeRemoveMealFormData({ planMealId: PLAN_ID }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError:
        "That day has passed. Plans can only be changed for today or later.",
    });
    expect(removePlannedMeal).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(getPlannedMeal).mockRejectedValue(new Error("database down"));

    const state = await removeMealAction(
      initialRemoveMealState,
      makeRemoveMealFormData({ planMealId: PLAN_ID }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The meal could not be removed. Please try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
