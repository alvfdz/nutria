import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { FoodPanel } from "@/components/calendar/food-panel";
import {
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
} from "@/components/ui/popover";
import type { Meal } from "@/lib/meals/types";
import type { SlotView } from "@/lib/plan/types";
import {
  makeMeal,
  makePlannedMealItem,
  makePlannedMealView,
  makeSlotView,
} from "@test/factories";

/**
 * Renders the panel inside the popup it expects to live in.
 *
 * @param overrides The food, library and callbacks to use.
 * @returns The `onAssigned` spy.
 */
function renderPanel(
  overrides: {
    slot?: SlotView;
    meals?: Meal[];
    onAssigned?: (name: string) => void;
  } = {},
): { onAssigned: (name: string) => void } {
  const onAssigned = overrides.onAssigned ?? vi.fn();

  render(
    <Popover open>
      <PopoverPortal>
        <PopoverPositioner>
          <PopoverPopup>
            <FoodPanel
              date="2026-10-13"
              slot={overrides.slot ?? makeSlotView()}
              meals={overrides.meals ?? []}
              removeAction={vi.fn()}
              removePending={false}
              onAssigned={onAssigned}
            />
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>,
  );

  return { onAssigned };
}

describe("FoodPanel", () => {
  test("shows the food, the day and its planned against target kcal", () => {
    renderPanel({
      slot: makeSlotView({
        name: "Lunch",
        target: {
          calories: 840,
          proteinGrams: 60,
          carbsGrams: 80,
          fatGrams: 28,
        },
        meals: [makePlannedMealView()],
        totals: { calories: 620, protein: 40, carbs: 60, fat: 20 },
      }),
    });

    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText(/Tue 13/)).toBeInTheDocument();
    expect(screen.getByText("620")).toBeInTheDocument();
    expect(screen.getByText(/840 kcal/)).toBeInTheDocument();
  });

  test("expands a meal to its ingredients with grams and calories", async () => {
    const user = userEvent.setup();
    renderPanel({
      slot: makeSlotView({
        meals: [
          makePlannedMealView({
            name: "Oatmeal & Protein Bowl",
            items: [
              makePlannedMealItem({
                id: "item-1",
                name: "Oats",
                grams: 80,
                calories: 311.2,
              }),
            ],
          }),
        ],
      }),
    });

    expect(screen.queryByText("Oats")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /^Oatmeal & Protein Bowl/ }),
    );

    expect(screen.getByText("Oats")).toBeInTheDocument();
    expect(screen.getByText("80 g")).toBeInTheDocument();
    expect(screen.getByText("311.2")).toBeInTheDocument();
  });

  test("offers a remove control carrying the plan row id", () => {
    renderPanel({
      slot: makeSlotView({
        name: "Lunch",
        meals: [makePlannedMealView({ id: "plan-42", name: "Porridge" })],
      }),
    });

    const remove = screen.getByRole("button", {
      name: "Remove Porridge from Lunch",
    });

    expect(remove).toHaveAttribute("name", "planMealId");
    expect(remove).toHaveAttribute("value", "plan-42");
  });

  test("reveals the picker from Add a meal and hides it again", async () => {
    const user = userEvent.setup();
    renderPanel({ meals: [makeMeal()] });

    expect(
      screen.queryByRole("textbox", { name: "Search meals" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Add a meal/ }));
    expect(
      screen.getByRole("textbox", { name: "Search meals" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Add a meal/ }));
    expect(
      screen.queryByRole("textbox", { name: "Search meals" }),
    ).not.toBeInTheDocument();
  });

  test("draws no bars and says nothing is planned yet when the food is empty", () => {
    renderPanel();

    expect(screen.getByText("Nothing planned yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("listitem", { name: /Protein: / }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText(/660 kcal/)).toBeInTheDocument();
  });
});
