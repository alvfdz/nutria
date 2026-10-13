import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { assignMealAction } from "@/app/calendar/actions";
import { AssignMealDialog } from "@/components/calendar/assign-meal-dialog";
import type { SlotBudget } from "@/lib/goals/budget";
import type { MealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";
import { initialAssignMealState } from "@/lib/plan/form-state";
import type { SlotView } from "@/lib/plan/types";
import { makeIngredient, makeMeal } from "@test/factories";

vi.mock("@/app/calendar/actions", () => ({ assignMealAction: vi.fn() }));

const action = vi.mocked(assignMealAction);

const DATE = "2026-10-13";
const SLOT_ID = "9f1c1f9e-0000-4000-8000-000000000010";

/** The slot's target: 600 kcal, 60 g protein, 60 g carbs and 20 g fat. */
const target: SlotBudget = {
  calories: 600,
  proteinGrams: 60,
  carbsGrams: 60,
  fatGrams: 20,
};

/** A slot with nothing planned yet. */
const emptySlot: SlotView = {
  id: SLOT_ID,
  name: "Breakfast",
  percent: 30,
  target,
  meals: [],
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
};

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
 * Renders the dialog over the given slot and library.
 *
 * @param overrides The slot, meals and callbacks to use.
 * @returns The `onClose` and `onAssigned` spies.
 */
function renderDialog(
  overrides: {
    slot?: SlotView;
    meals?: Meal[];
    onClose?: () => void;
    onAssigned?: (name: string) => void;
  } = {},
) {
  const onClose = overrides.onClose ?? vi.fn();
  const onAssigned = overrides.onAssigned ?? vi.fn();

  render(
    <AssignMealDialog
      date={DATE}
      slot={overrides.slot ?? emptySlot}
      meals={overrides.meals ?? [porridge, feast]}
      onClose={onClose}
      onAssigned={onAssigned}
    />,
  );

  return { onClose, onAssigned };
}

beforeEach(() => {
  action.mockReset();
  action.mockImplementation(async () => initialAssignMealState);
});

describe("AssignMealDialog", () => {
  test("names the slot and shows the day and remaining budget", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");

    expect(
      within(dialog).getByRole("heading", { name: "Add to Breakfast" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Tue 13/)).toBeInTheDocument();
    expect(within(dialog).getByText("600 kcal")).toBeInTheDocument();
    expect(within(dialog).getByText(/remaining/)).toBeInTheDocument();
  });

  test("filters the library by name as the user types", async () => {
    const user = userEvent.setup();
    renderDialog();

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

  test("blocks a meal that is already planned into the slot", () => {
    const totals: MealTotals = {
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 5,
    };
    renderDialog({
      slot: {
        ...emptySlot,
        meals: [
          { id: "plan-1", mealId: porridge.id, name: "Porridge", totals },
        ],
        totals,
      },
    });

    expect(screen.getByRole("button", { name: "Add Porridge" })).toBeDisabled();
    expect(screen.getByText("Already added")).toBeInTheDocument();
  });

  test("flags a meal that would push the slot over its kcal target", () => {
    renderDialog();

    expect(screen.getByText("over by 100")).toBeInTheDocument();
  });

  test("submits the chosen meal through the action", async () => {
    const user = userEvent.setup();
    let submitted: FormData | undefined;
    action.mockImplementation(async (_state, formData) => {
      submitted = formData;
      return initialAssignMealState;
    });

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Add Porridge" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(submitted!.get("date")).toBe(DATE);
    expect(submitted!.get("mealSlotId")).toBe(SLOT_ID);
    expect(submitted!.get("mealId")).toBe("meal-porridge");
    expect(submitted!.get("mealName")).toBe("Porridge");
  });

  test("announces the planned meal and closes once the action succeeds", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "success",
      assignedName: "Porridge",
    }));

    const { onClose, onAssigned } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Add Porridge" }));

    await waitFor(() => expect(onAssigned).toHaveBeenCalledWith("Porridge"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("stays open with the message when the assign fails", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "error",
      formError: "That meal is already planned in this slot.",
    }));

    const { onClose } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Add Porridge" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That meal is already planned in this slot.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("points at the meal library when it is empty", () => {
    renderDialog({ meals: [] });

    expect(screen.getByText(/Your meal library is empty/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Build a meal" })).toHaveAttribute(
      "href",
      "/meals",
    );
  });
});
