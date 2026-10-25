import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { WeekBoard } from "@/components/calendar/week-board";
import { dayOfMonth, weekDays, weekdayShort } from "@/lib/calendar/week";
import type { MacroBudget, SlotBudget } from "@/lib/goals/budget";
import type { MealTotals } from "@/lib/meals/macros";
import type { DayColumn } from "@/lib/plan/types";
import { makeSlotView } from "@test/factories";

vi.mock("@/app/(app)/calendar/actions", () => ({
  assignMealAction: vi.fn(),
  removeMealAction: vi.fn(),
}));

/** The day's total target, used for the column header. */
const budget: MacroBudget = {
  calories: 2200,
  proteinGrams: 156,
  carbsGrams: 200,
  fatGrams: 70,
};

/** One target per Goals slot. */
const slotTargets: SlotBudget[] = [
  { calories: 660, proteinGrams: 46.8, carbsGrams: 60, fatGrams: 21 },
  { calories: 880, proteinGrams: 62, carbsGrams: 80, fatGrams: 28 },
  { calories: 660, proteinGrams: 47, carbsGrams: 60, fatGrams: 21 },
];

const slotNames = ["Breakfast", "Lunch", "Dinner"];
const ZERO: MealTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

/** The week of Mon 12 Oct 2026, with today standing on Wednesday. */
function makeDays(): DayColumn[] {
  return weekDays("2026-10-12").map((date) => ({
    date,
    weekday: weekdayShort(date),
    dayOfMonth: dayOfMonth(date),
    isToday: date === "2026-10-14",
    isEditable: date >= "2026-10-13",
    budget,
    planned: ZERO,
    slots: slotNames.map((name, index) => ({
      ...makeSlotView({
        id: `meal-slot-${index + 1}`,
        name,
        target: slotTargets[index],
        meals: [],
        totals: ZERO,
      }),
    })),
  }));
}

describe("WeekBoard", () => {
  test("renders seven day columns, Monday through Sunday", () => {
    render(<WeekBoard days={makeDays()} meals={[]} />);

    for (const weekday of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(weekday)).toBeInTheDocument();
    }
  });

  test("renders one card per food per day", () => {
    render(<WeekBoard days={makeDays()} meals={[]} />);

    expect(screen.getAllByText("Breakfast")).toHaveLength(7);
    expect(screen.getAllByText("Lunch")).toHaveLength(7);
    expect(screen.getAllByText("Dinner")).toHaveLength(7);
  });

  test("marks today's column", () => {
    render(<WeekBoard days={makeDays()} meals={[]} />);

    expect(screen.getByText("14").closest("[data-today]")).toHaveAttribute(
      "data-today",
      "true",
    );
    expect(screen.getByText("12").closest("[data-today]")).toBeNull();
  });

  test("a past card has no button", () => {
    render(<WeekBoard days={makeDays()} meals={[]} />);

    expect(
      screen.queryByRole("button", { name: /Breakfast, Mon 12/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Breakfast, Tue 13/ }),
    ).toBeInTheDocument();
  });

  test("opening one food opens one panel and opening a second closes the first", async () => {
    const user = userEvent.setup();
    render(<WeekBoard days={makeDays()} meals={[]} />);

    await user.click(screen.getByRole("button", { name: /Breakfast, Tue 13/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Lunch, Tue 13/ }));
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
  });

  test("falls back to a zero target when a day has no budget", () => {
    const days = makeDays().map((day) => ({ ...day, budget: null }));

    render(<WeekBoard days={days} meals={[]} />);

    expect(screen.getAllByText("0 / 0 kcal")).toHaveLength(7);
  });

  test("a food whose slot vanished renders no panel", async () => {
    const user = userEvent.setup();
    const days = makeDays();
    const { rerender } = render(<WeekBoard days={days} meals={[]} />);

    await user.click(screen.getByRole("button", { name: /Breakfast, Tue 13/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const daysWithoutBreakfast = days.map((day) => ({
      ...day,
      slots: day.slots.filter((slot) => slot.name !== "Breakfast"),
    }));

    rerender(<WeekBoard days={daysWithoutBreakfast} meals={[]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
