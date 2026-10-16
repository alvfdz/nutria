import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { SlotCard } from "@/components/calendar/slot-card";
import type { SlotView } from "@/lib/plan/types";
import { makePlannedMealView, makeSlotView } from "@test/factories";

/**
 * Renders the card with the given slot, editability and open state.
 *
 * @param overrides The slot, `editable` and `open` values to use.
 * @returns The `onOpen` spy, so a test can assert it fired.
 */
function renderCard(
  overrides: { slot?: SlotView; editable?: boolean; open?: boolean } = {},
): { onOpen: ReturnType<typeof vi.fn> } {
  const onOpen = vi.fn();

  render(
    <SlotCard
      date="2026-10-13"
      slot={overrides.slot ?? makeSlotView()}
      editable={overrides.editable ?? true}
      open={overrides.open ?? false}
      onOpen={onOpen}
    />,
  );

  return { onOpen };
}

describe("SlotCard", () => {
  test("shows the food, the planned and target kcal, and one row per meal", () => {
    renderCard({
      slot: makeSlotView({
        name: "Lunch",
        target: {
          calories: 840,
          proteinGrams: 60,
          carbsGrams: 80,
          fatGrams: 28,
        },
        meals: [
          makePlannedMealView({ name: "Chicken & Rice Bowl", id: "plan-1" }),
          makePlannedMealView({ name: "Greek Yogurt", id: "plan-2" }),
        ],
        totals: { calories: 620, protein: 40, carbs: 60, fat: 20 },
      }),
    });

    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("620")).toBeInTheDocument();
    expect(screen.getByText("/ 840")).toBeInTheDocument();
    expect(screen.getByText("Chicken & Rice Bowl")).toBeInTheDocument();
    expect(screen.getByText("Greek Yogurt")).toBeInTheDocument();
    // One kcal figure per meal row.
    expect(screen.getAllByText("462")).toHaveLength(2);
  });

  test("shows the target alone and a placeholder when nothing is planned", () => {
    renderCard();

    expect(screen.getByText("Nothing planned")).toBeInTheDocument();
    expect(screen.getByText("660")).toBeInTheDocument();
    expect(screen.queryByText("/ 660")).not.toBeInTheDocument();
  });

  test("marks food over its kcal target and names the excess", () => {
    renderCard({
      slot: makeSlotView({
        name: "Lunch",
        target: {
          calories: 840,
          proteinGrams: 60,
          carbsGrams: 80,
          fatGrams: 28,
        },
        meals: [makePlannedMealView({ name: "Chicken & Rice Bowl" })],
        totals: { calories: 900, protein: 40, carbs: 60, fat: 20 },
      }),
    });

    expect(screen.getByText("▲")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /60 kcal over target/ }),
    ).toBeInTheDocument();
  });

  test("names the card with the food and the day when editable", () => {
    renderCard({ slot: makeSlotView({ name: "Breakfast" }) });

    expect(
      screen.getByRole("button", { name: /Breakfast, Tue 13/ }),
    ).toBeInTheDocument();
  });

  test("mirrors the open state through aria-expanded and opens on click", async () => {
    const user = userEvent.setup();
    const { onOpen } = renderCard({ open: true });

    const card = screen.getByRole("button", { name: /Breakfast/ });

    expect(card).toHaveAttribute("aria-expanded", "true");
    expect(card).toHaveAttribute("aria-haspopup", "dialog");

    await user.click(card);

    expect(onOpen).toHaveBeenCalledOnce();
  });

  test("is not a button and has nothing focusable on a past day", () => {
    renderCard({
      editable: false,
      slot: makeSlotView({
        meals: [makePlannedMealView({ name: "Porridge" })],
      }),
    });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Porridge")).toBeInTheDocument();
  });

  test("carries no macro chips, add or remove controls", () => {
    const { container } = render(
      <SlotCard
        date="2026-10-13"
        slot={makeSlotView({
          meals: [makePlannedMealView({ name: "Porridge" })],
        })}
        editable={true}
        open={false}
        onOpen={vi.fn()}
      />,
    );
    const card = within(container);

    expect(card.queryByRole("listitem")).not.toBeInTheDocument();
    expect(card.queryByText(/Add meal/)).not.toBeInTheDocument();
    expect(
      card.queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
  });

  test("clips a long food name so the card cannot widen", () => {
    const longName = "a".repeat(60);
    renderCard({ slot: makeSlotView({ name: longName }) });

    const name = screen.getByText(longName);
    expect(name).toHaveClass("truncate");
    expect(name).toHaveAttribute("title", longName);
  });

  test("clips a long meal name and lets its row and grid shrink", () => {
    const longName = "a".repeat(60);
    renderCard({
      slot: makeSlotView({
        meals: [makePlannedMealView({ name: longName })],
      }),
    });

    const name = screen.getByText(longName);
    expect(name).toHaveClass("truncate");
    expect(name).toHaveAttribute("title", longName);
    // Without `min-w-0` on the row and the grid that holds it, the grid track
    // grows to the name's intrinsic width and widens the card instead.
    expect(name.parentElement).toHaveClass("min-w-0");
    expect(name.parentElement?.parentElement).toHaveClass("min-w-0");
  });
});
