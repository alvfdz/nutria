import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { SlotCard } from "@/components/calendar/slot-card";
import type { SlotBudget } from "@/lib/goals/budget";
import type { MealTotals } from "@/lib/meals/macros";
import type { SlotView } from "@/lib/plan/types";

/** The slot's target macros. */
const target: SlotBudget = {
  calories: 600,
  proteinGrams: 60,
  carbsGrams: 60,
  fatGrams: 20,
};

/** A slot view with nothing planned. */
function makeSlot(overrides: Partial<SlotView> = {}): SlotView {
  return {
    id: "meal-slot-1",
    name: "Breakfast",
    percent: 30,
    target,
    meals: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ...overrides,
  };
}

/** A one-meal slot view carrying explicit totals. */
function plannedSlot(mealTotals: MealTotals): SlotView {
  return makeSlot({
    meals: [
      { id: "plan-1", mealId: "meal-1", name: "Porridge", totals: mealTotals },
    ],
    totals: mealTotals,
  });
}

/**
 * Renders the card with the given slot and editability.
 *
 * @param overrides The slot and `editable` flag to use.
 * @returns The `onAdd` spy, so a test can assert it fired.
 */
function renderCard(overrides: { slot?: SlotView; editable?: boolean } = {}): {
  onAdd: ReturnType<typeof vi.fn>;
} {
  const onAdd = vi.fn();

  render(
    <SlotCard
      date="2026-10-13"
      slot={overrides.slot ?? makeSlot()}
      editable={overrides.editable ?? true}
      addButtonId="add-2026-10-13-meal-slot-1"
      onAdd={onAdd}
      removeAction={vi.fn()}
      removePending={false}
    />,
  );

  return { onAdd };
}

describe("SlotCard", () => {
  test("labels the card as the slot on its day", () => {
    renderCard();

    expect(
      screen.getByRole("region", { name: "Breakfast on 2026-10-13" }),
    ).toBeInTheDocument();
  });

  test("shows the planned kcal against the slot target", () => {
    renderCard({
      slot: plannedSlot({ calories: 240, protein: 20, carbs: 40, fat: 8 }),
    });

    // Once in the slot header and once on the meal row.
    expect(screen.getAllByText("240")).toHaveLength(2);
    expect(screen.getByText("/ 600")).toBeInTheDocument();
  });

  test("shows a placeholder when nothing is planned", () => {
    renderCard();

    expect(screen.getByText("Nothing planned")).toBeInTheDocument();
  });

  test("lists each planned meal with its kcal and a labelled remove button", () => {
    renderCard({
      slot: plannedSlot({ calories: 240, protein: 20, carbs: 40, fat: 8 }),
    });

    expect(screen.getByText("Porridge")).toBeInTheDocument();
    // Once in the slot header and once on the meal row.
    expect(screen.getAllByText("240")).toHaveLength(2);
    expect(
      screen.getByRole("button", {
        name: "Remove Porridge from Breakfast",
      }),
    ).toBeInTheDocument();
  });

  test("renders the three macro guidance chips", () => {
    renderCard();

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  test("opens the assign dialog from Add meal when editable", async () => {
    const user = userEvent.setup();
    const { onAdd } = renderCard();

    await user.click(screen.getByRole("button", { name: /Add meal/ }));

    expect(onAdd).toHaveBeenCalledOnce();
  });

  test("hides every control on a read-only day", () => {
    renderCard({
      slot: plannedSlot({ calories: 240, protein: 20, carbs: 40, fat: 8 }),
      editable: false,
    });

    const card = screen.getByRole("region", {
      name: "Breakfast on 2026-10-13",
    });

    expect(
      within(card).queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByRole("button", { name: /Add meal/ }),
    ).not.toBeInTheDocument();
  });
});
