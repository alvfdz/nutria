import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  assignMealAction,
  removeMealAction,
} from "@/app/(app)/calendar/actions";
import { WeekBoard } from "@/components/calendar/week-board";
import { dayOfMonth, weekDays, weekdayShort } from "@/lib/calendar/week";
import type { MacroBudget, SlotBudget } from "@/lib/goals/budget";
import type { MealTotals } from "@/lib/meals/macros";
import type { DayColumn } from "@/lib/plan/types";
import { makeMeal, makePlannedMealView, makeSlotView } from "@test/factories";

vi.mock("@/app/(app)/calendar/actions", () => ({
  assignMealAction: vi.fn(),
  removeMealAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(assignMealAction).mockReset();
  vi.mocked(removeMealAction).mockReset();
});

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

    const headers = document.querySelectorAll('[data-slot="day-planned"]');

    expect(headers).toHaveLength(7);
    for (const header of headers) {
      expect(header.parentElement).toHaveTextContent(/^0\/0\skcal$/);
    }
  });

  test("names each day as a region and heading", () => {
    render(<WeekBoard days={makeDays()} meals={[]} />);

    expect(screen.getByRole("region", { name: "Tue 13" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(7);
  });

  test("makes each day span one board row per header and slot", () => {
    render(<WeekBoard days={makeDays()} meals={[]} />);

    expect(screen.getByRole("region", { name: "Tue 13" })).toHaveStyle({
      gridRow: "span 4",
    });
  });

  test("keeps past days readable rather than dimming them", () => {
    render(<WeekBoard days={makeDays()} meals={[]} />);

    const past = screen.getByRole("region", { name: "Mon 12" });

    expect(past).not.toHaveClass("opacity-60");
    expect(past).toHaveClass("bg-transparent");
  });

  test("shows no marker on a day with nothing planned", () => {
    render(<WeekBoard days={makeDays()} meals={[]} />);

    expect(
      document.querySelector('[data-slot="day-marker"]'),
    ).not.toBeInTheDocument();
  });

  test.each([
    { calories: 2200, marker: "✓", sentence: "On target" },
    { calories: 1000, marker: "−1200", sentence: "1200 kcal short of target" },
    { calories: 2500, marker: "+300", sentence: "300 kcal over target" },
  ])(
    "marks a day planned at $calories kcal with $marker",
    ({ calories, marker, sentence }) => {
      const days = makeDays();
      days[2] = { ...days[2], planned: { ...ZERO, calories } };

      render(<WeekBoard days={days} meals={[]} />);

      const day = screen.getByRole("region", { name: "Wed 14" });

      expect(day.querySelector('[data-slot="day-marker"]')).toHaveTextContent(
        marker,
      );
      expect(day).toHaveTextContent(sentence);
    },
  );

  test("shows a day's planned kcal as a whole number", () => {
    const days = makeDays();
    days[2] = { ...days[2], planned: { ...ZERO, calories: 139.6 } };

    render(<WeekBoard days={days} meals={[]} />);

    expect(
      screen
        .getByRole("region", { name: "Wed 14" })
        .querySelector('[data-slot="day-planned"]'),
    ).toHaveTextContent(/^140$/);
  });

  test("does not carry an open picker over to the next food", async () => {
    const user = userEvent.setup();
    const days = makeDays();
    const meal = makePlannedMealView({ name: "Porridge" });
    days[1] = {
      ...days[1],
      slots: days[1].slots.map((slot) => ({ ...slot, meals: [meal] })),
    };
    render(<WeekBoard days={days} meals={[]} />);

    await user.click(screen.getByRole("button", { name: /Breakfast, Tue 13/ }));
    await user.click(screen.getByRole("button", { name: /Add a meal/ }));
    expect(screen.getByText("Your meal library is empty")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Lunch, Tue 13/ }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Lunch");
    expect(
      screen.queryByText("Your meal library is empty"),
    ).not.toBeInTheDocument();
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
  /**
   * Opens Tuesday's Breakfast panel, holding one planned Porridge.
   *
   * @returns The user-event instance driving the board.
   */
  async function openPlannedBreakfast() {
    const user = userEvent.setup();
    const days = makeDays();
    const meal = makePlannedMealView({ id: "plan-1", name: "Porridge" });
    days[1] = {
      ...days[1],
      slots: days[1].slots.map((slot) =>
        slot.name === "Breakfast" ? { ...slot, meals: [meal] } : slot,
      ),
    };
    render(<WeekBoard days={days} meals={[makeMeal({ name: "Omelette" })]} />);

    await user.click(screen.getByRole("button", { name: /Breakfast, Tue 13/ }));

    return user;
  }

  test("announces a removed meal in the live region", async () => {
    vi.mocked(removeMealAction).mockResolvedValue({
      status: "success",
      removedName: "Porridge",
    });
    const user = await openPlannedBreakfast();

    await user.click(
      screen.getByRole("button", { name: "Remove Porridge from Breakfast" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Porridge removed from your plan.",
      ),
    );
    expect(vi.mocked(removeMealAction).mock.calls[0][1].get("planMealId")).toBe(
      "plan-1",
    );
  });

  test("announces a failed remove's message", async () => {
    vi.mocked(removeMealAction).mockResolvedValue({
      status: "error",
      formError: "That planned meal no longer exists. Reload the page.",
    });
    const user = await openPlannedBreakfast();

    await user.click(
      screen.getByRole("button", { name: "Remove Porridge from Breakfast" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "That planned meal no longer exists. Reload the page.",
      ),
    );
  });

  test.each([{ status: "success" as const }, { status: "error" as const }])(
    "announces nothing for a $status remove without a name or message",
    async (state) => {
      vi.mocked(removeMealAction).mockResolvedValue(state);
      const user = await openPlannedBreakfast();

      await user.click(
        screen.getByRole("button", { name: "Remove Porridge from Breakfast" }),
      );

      await waitFor(() => expect(removeMealAction).toHaveBeenCalledOnce());
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    },
  );

  test("announces a meal added from the panel's picker", async () => {
    vi.mocked(assignMealAction).mockResolvedValue({
      status: "success",
      assignedName: "Omelette",
    });
    const user = await openPlannedBreakfast();

    await user.click(screen.getByRole("button", { name: /Add a meal/ }));
    await user.click(screen.getByRole("button", { name: "Add Omelette" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Omelette added to your plan.",
      ),
    );
  });
});
