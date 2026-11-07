import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { setMealEatenAction, swapMealAction } from "@/app/(app)/actions";
import { assignMealAction } from "@/app/(app)/calendar/actions";
import { TodayBoard } from "@/components/today/today-board";
import { toast } from "@/components/ui/toast";
import type { Meal } from "@/lib/meals/types";
import type { DayColumn, PlannedMealView } from "@/lib/plan/types";
import {
  makeDayColumn,
  makeIngredient,
  makeMeal,
  makePlannedMealView,
  makeSlotView,
} from "@test/factories";

vi.mock("@/app/(app)/actions", () => ({
  setMealEatenAction: vi.fn(),
  swapMealAction: vi.fn(),
}));
vi.mock("@/app/(app)/calendar/actions", () => ({ assignMealAction: vi.fn() }));
vi.mock("@/components/ui/toast", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/ui/toast")>()),
  toast: { add: vi.fn() },
}));

const tickAction = vi.mocked(setMealEatenAction);
const swapAction = vi.mocked(swapMealAction);
const assignAction = vi.mocked(assignMealAction);

const PLAN_ID = "9f1c1f9e-0000-4000-8000-000000000030";

/** A planned meal delivering exactly `calories`. */
function planned(
  name: string,
  calories: number,
  overrides: Partial<PlannedMealView> = {},
): PlannedMealView {
  return makePlannedMealView({
    id: PLAN_ID,
    mealId: `meal-${name}`,
    name,
    totals: { calories, protein: 10, carbs: 10, fat: 10 },
    ...overrides,
  });
}

/** A day with the given meals in a Lunch slot of 660 kcal, of 2200 for the day. */
function dayWith(...meals: PlannedMealView[]): DayColumn {
  return makeDayColumn({
    date: "2026-10-14",
    isToday: true,
    slots: [
      makeSlotView({
        id: "slot-lunch",
        name: "Lunch",
        meals,
        totals: {
          calories: meals.reduce((sum, meal) => sum + meal.totals.calories, 0),
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      }),
    ],
  });
}

/** A library meal with exactly `calories` kcal. */
function library(id: string, name: string, calories: number): Meal {
  return makeMeal({
    id,
    name,
    items: [
      {
        id: `item-${id}`,
        ingredientId: `ing-${id}`,
        grams: 100,
        sortOrder: 0,
        ingredient: makeIngredient({
          id: `ing-${id}`,
          caloriesPer100g: calories,
        }),
      },
    ],
  });
}

/** The figure beside the hero's "kcal left" or "kcal over". */
const hero = () => screen.getByRole("heading", { level: 2, name: /kcal/ });

beforeEach(() => {
  vi.resetAllMocks();
});

describe("TodayBoard", () => {
  test("shows what's left, what's eaten and what's still planned", () => {
    render(
      <TodayBoard
        day={dayWith(
          planned("Oats", 450, { id: "a", eaten: true }),
          planned("Rice", 700, { id: "b" }),
        )}
        meals={[]}
      />,
    );

    expect(hero()).toHaveTextContent("1750kcal left");
    expect(
      screen.getByRole("img", {
        name: "450 of 2200 kcal eaten, 700 kcal still planned",
      }),
    ).toBeInTheDocument();
  });

  test("reads an overshoot plainly", () => {
    render(
      <TodayBoard
        day={dayWith(planned("Feast", 2320, { eaten: true }))}
        meals={[]}
      />,
    );

    expect(hero()).toHaveTextContent("120kcal over");
    expect(hero().querySelector(".text-destructive")).toBeNull();
  });

  test("a tick moves the budget before the save finishes", async () => {
    const user = userEvent.setup();
    let finish = () => {};
    tickAction.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ status: "success" });
      }),
    );

    render(<TodayBoard day={dayWith(planned("Rice", 700))} meals={[]} />);

    await user.click(screen.getByRole("checkbox", { name: "Rice" }));

    expect(hero()).toHaveTextContent("1500kcal left");

    const formData = tickAction.mock.calls[0][1];
    expect(formData.get("planMealId")).toBe(PLAN_ID);
    expect(formData.get("eaten")).toBe("true");

    await act(async () => finish());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Rice marked as eaten.",
    );
  });

  test("a failed save rolls back and shows a toast", async () => {
    const user = userEvent.setup();
    tickAction.mockResolvedValue({
      status: "error",
      formError: "The meal could not be updated. Please try again.",
    });

    render(<TodayBoard day={dayWith(planned("Rice", 700))} meals={[]} />);

    await user.click(screen.getByRole("checkbox", { name: "Rice" }));

    await waitFor(() => {
      expect(toast.add).toHaveBeenCalledWith({
        type: "error",
        title: "The meal could not be updated. Please try again.",
      });
    });
    expect(screen.getByRole("checkbox", { name: "Rice" })).not.toBeChecked();
    expect(hero()).toHaveTextContent("2200kcal left");
  });

  test("a rejected action rolls back and shows a toast", async () => {
    const user = userEvent.setup();
    tickAction.mockRejectedValue(new Error("offline"));

    render(<TodayBoard day={dayWith(planned("Rice", 700))} meals={[]} />);

    await user.click(screen.getByRole("checkbox", { name: "Rice" }));

    await waitFor(() => expect(toast.add).toHaveBeenCalledOnce());
    // The toast fires inside the transition; the optimistic tick is only
    // dropped once it settles, a render later.
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Rice" })).not.toBeChecked(),
    );
  });

  test("offers no swap on a ticked meal", () => {
    render(
      <TodayBoard
        day={dayWith(planned("Rice", 700, { eaten: true }))}
        meals={[]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Swap Rice" }),
    ).not.toBeInTheDocument();
  });

  test("gives each copy of a template its own tick", () => {
    render(
      <TodayBoard
        day={dayWith(
          planned("Rice", 700, { id: "a", mealId: "same" }),
          planned("Rice", 700, { id: "b", mealId: "same" }),
        )}
        meals={[]}
      />,
    );

    expect(screen.getAllByRole("checkbox", { name: "Rice" })).toHaveLength(2);
  });

  test("keeps a long name truncated with the full text in its title", () => {
    const name = "A very long meal name".repeat(10);

    render(<TodayBoard day={dayWith(planned(name, 700))} meals={[]} />);

    const label = screen.getByTitle(name);
    expect(label).toHaveClass("truncate", "min-w-0");
  });

  test("swap offers the other meals, counting the replaced kcal as free", async () => {
    const user = userEvent.setup();

    render(
      <TodayBoard
        day={dayWith(planned("Rice", 600, { mealId: "rice" }))}
        meals={[
          library("rice", "Rice", 600),
          library("fits", "Fits", 650),
          library("big", "Big", 700),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Swap Rice" }));

    expect(
      await screen.findByRole("button", { name: /Swap to Fits/ }),
    ).not.toHaveTextContent("over by");
    expect(
      screen.getByRole("button", { name: /Swap to Big/ }),
    ).toHaveTextContent("over by 40");
    expect(
      screen.queryByRole("button", { name: /Swap to Rice/ }),
    ).not.toBeInTheDocument();
  });

  test("submits a swap, announces it and closes the picker", async () => {
    const user = userEvent.setup();
    swapAction.mockResolvedValue({ status: "success", swappedName: "Salmon" });

    render(
      <TodayBoard
        day={dayWith(planned("Rice", 600))}
        meals={[library("salmon", "Salmon", 500)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Swap Rice" }));
    await user.click(
      await screen.findByRole("button", { name: "Swap to Salmon" }),
    );

    const formData = swapAction.mock.calls[0][1];
    expect(formData.get("planMealId")).toBe(PLAN_ID);
    expect(formData.get("mealId")).toBe("salmon");

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Swapped to Salmon.",
      );
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Swap to Salmon" }),
      ).not.toBeInTheDocument();
    });
  });

  test("says so when there's nothing else to swap to", async () => {
    const user = userEvent.setup();

    render(
      <TodayBoard
        day={dayWith(planned("Rice", 600, { mealId: "rice" }))}
        meals={[library("rice", "Rice", 600)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Swap Rice" }));

    expect(
      await screen.findByText("No other meals to swap to"),
    ).toBeInTheDocument();
  });

  test("add opens the picker for that slot", async () => {
    const user = userEvent.setup();

    render(
      <TodayBoard day={dayWith()} meals={[library("salmon", "Salmon", 500)]} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Add a meal to Lunch" }),
    );

    expect(
      await screen.findByRole("button", { name: "Add Salmon" }),
    ).toBeInTheDocument();
  });

  test("unticking an eaten meal announces it", async () => {
    const user = userEvent.setup();
    tickAction.mockResolvedValue({ status: "success" });

    render(
      <TodayBoard
        day={dayWith(planned("Rice", 700, { eaten: true }))}
        meals={[]}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Rice" }));

    expect(tickAction.mock.calls[0][1].get("eaten")).toBe("false");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Rice unticked."),
    );
  });

  test("announces a meal added from the picker", async () => {
    const user = userEvent.setup();
    assignAction.mockResolvedValue({
      status: "success",
      assignedName: "Salmon",
    });

    render(
      <TodayBoard day={dayWith()} meals={[library("salmon", "Salmon", 500)]} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Add a meal to Lunch" }),
    );
    await user.click(await screen.findByRole("button", { name: "Add Salmon" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Salmon added to today.",
      ),
    );
  });

  test("shows the macro bars only when goals are set", () => {
    const macroBar = { name: /^Protein:/ };
    const { rerender } = render(
      <TodayBoard day={dayWith(planned("Rice", 700))} meals={[]} />,
    );
    expect(screen.getByRole("listitem", macroBar)).toBeInTheDocument();

    rerender(
      <TodayBoard
        day={{ ...dayWith(planned("Rice", 700)), budget: null }}
        meals={[]}
      />,
    );

    expect(screen.queryByRole("listitem", macroBar)).not.toBeInTheDocument();
  });
});
