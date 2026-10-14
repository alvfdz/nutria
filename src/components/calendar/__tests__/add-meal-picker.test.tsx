import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { assignMealAction } from "@/app/calendar/actions";
import { AddMealPicker } from "@/components/calendar/add-meal-picker";
import type { SlotBudget } from "@/lib/goals/budget";
import type { MealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";
import { initialAssignMealState } from "@/lib/plan/form-state";
import type { SlotView } from "@/lib/plan/types";
import {
  makeIngredient,
  makeMeal,
  makePlannedMealView,
  makeSlotView,
} from "@test/factories";

vi.mock("@/app/calendar/actions", () => ({ assignMealAction: vi.fn() }));

const action = vi.mocked(assignMealAction);

const DATE = "2026-10-13";
const SLOT_ID = "9f1c1f9e-0000-4000-8000-000000000010";

/** The food's target: 600 kcal, 60 g protein, 60 g carbs and 20 g fat. */
const target: SlotBudget = {
  calories: 600,
  proteinGrams: 60,
  carbsGrams: 60,
  fatGrams: 20,
};

/** An empty food to fill. */
function emptySlot(): SlotView {
  return makeSlotView({ id: SLOT_ID, name: "Breakfast", target });
}

/**
 * Builds a meal whose totals are exactly `calories`, through one 100 g item of
 * an ingredient carrying that many kcal per 100 g.
 *
 * @param id Identifier of the meal and its single item.
 * @param name Display name of the meal.
 * @param calories Kilocalories the whole meal delivers.
 */
function mealWithCalories(id: string, name: string, calories: number): Meal {
  const ingredient = makeIngredient({
    id: `ing-${id}`,
    name: `${name} ingredient`,
    caloriesPer100g: calories,
    proteinPer100g: 10,
    carbsPer100g: 10,
    fatPer100g: 5,
  });

  return makeMeal({
    id,
    name,
    items: [
      {
        id: `item-${id}`,
        sortOrder: 0,
        ingredientId: ingredient.id,
        grams: 100,
        ingredient,
      },
    ],
  });
}

const porridge = mealWithCalories("meal-porridge", "Porridge", 100);
const feast = mealWithCalories("meal-feast", "Feast Bowl", 700);

/**
 * Renders the picker over the given food and library.
 *
 * @param overrides The slot, meals and `onAssigned` callback to use.
 * @returns The `onAssigned` spy.
 */
function renderPicker(
  overrides: {
    slot?: SlotView;
    meals?: Meal[];
    onAssigned?: (name: string) => void;
  } = {},
) {
  const onAssigned = overrides.onAssigned ?? vi.fn();

  render(
    <AddMealPicker
      date={DATE}
      slot={overrides.slot ?? emptySlot()}
      meals={overrides.meals ?? [porridge, feast]}
      onAssigned={onAssigned}
    />,
  );

  return { onAssigned };
}

beforeEach(() => {
  action.mockReset();
  action.mockImplementation(async () => initialAssignMealState);
});

describe("AddMealPicker", () => {
  test("filters the library by name as the user types", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.type(
      screen.getByRole("textbox", { name: "Search meals" }),
      "porr",
    );

    expect(
      screen.getByRole("button", { name: "Add Porridge" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Feast Bowl" }),
    ).not.toBeInTheDocument();
  });

  test("blocks a meal that is already in the food", () => {
    const totals: MealTotals = {
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 5,
    };
    renderPicker({
      slot: makeSlotView({
        id: SLOT_ID,
        name: "Breakfast",
        target,
        meals: [
          makePlannedMealView({
            id: "plan-1",
            mealId: porridge.id,
            name: "Porridge",
            totals,
          }),
        ],
        totals,
      }),
    });

    expect(screen.getByRole("button", { name: "Add Porridge" })).toBeDisabled();
    expect(screen.getByText("Already added")).toBeInTheDocument();
  });

  test("flags a meal that would push the food over its kcal target", () => {
    renderPicker();

    expect(screen.getByText("over by 100")).toBeInTheDocument();
  });

  test("submits the chosen meal through the action", async () => {
    const user = userEvent.setup();
    let submitted: FormData | undefined;
    action.mockImplementation(async (_state, formData) => {
      submitted = formData;
      return initialAssignMealState;
    });

    renderPicker();
    await user.click(screen.getByRole("button", { name: "Add Porridge" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(submitted!.get("date")).toBe(DATE);
    expect(submitted!.get("mealSlotId")).toBe(SLOT_ID);
    expect(submitted!.get("mealId")).toBe("meal-porridge");
    expect(submitted!.get("mealName")).toBe("Porridge");
  });

  test("announces the added meal and leaves the picker open", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "success",
      assignedName: "Porridge",
    }));

    const { onAssigned } = renderPicker();

    await user.type(
      screen.getByRole("textbox", { name: "Search meals" }),
      "porr",
    );
    await user.click(screen.getByRole("button", { name: "Add Porridge" }));

    await waitFor(() => expect(onAssigned).toHaveBeenCalledWith("Porridge"));
    const search = screen.getByRole("textbox", { name: "Search meals" });
    expect(search).toHaveValue("porr");
  });

  test("shows the message and stays open when the assign fails", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "error",
      formError: "That meal is already planned in this slot.",
    }));

    renderPicker();
    await user.click(screen.getByRole("button", { name: "Add Porridge" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That meal is already planned in this slot.",
    );
    expect(
      screen.getByRole("textbox", { name: "Search meals" }),
    ).toBeInTheDocument();
  });

  test("points at the meal library when it is empty", () => {
    renderPicker({ meals: [] });

    const message = screen.getByText(/Your meal library is empty/);
    expect(
      within(message).getByRole("link", { name: "Build a meal" }),
    ).toHaveAttribute("href", "/meals");
  });
});
