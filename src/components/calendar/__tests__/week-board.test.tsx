import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { type DayColumn, WeekBoard } from "@/components/calendar/week-board";
import { formatDayLabel, weekDays } from "@/lib/calendar/week";
import type { MacroBudget, SlotBudget } from "@/lib/goals/budget";

/** A day budget whose calorie target has no decimal, unlike the slot targets. */
const dayBudget: MacroBudget = {
  calories: 2200,
  proteinGrams: 156,
  carbsGrams: 200,
  fatGrams: 70,
};

/** One target per Goals slot; the first carries a decimal to prove formatting. */
const slotTargets: SlotBudget[] = [
  { calories: 660, proteinGrams: 46.8, carbsGrams: 60, fatGrams: 21 },
  { calories: 880, proteinGrams: 62, carbsGrams: 80, fatGrams: 28 },
  { calories: 660, proteinGrams: 47, carbsGrams: 60, fatGrams: 21 },
];

const slotNames = ["Breakfast", "Lunch", "Dinner"];

/** The week of Mon 12 Oct 2026, with today standing on Wednesday. */
function makeDays(): DayColumn[] {
  return weekDays("2026-10-12").map((date) => ({
    date,
    label: formatDayLabel(date),
    isToday: date === "2026-10-14",
    budget: dayBudget,
    slots: slotNames.map((name, index) => ({
      name,
      percent: 30,
      target: slotTargets[index],
    })),
  }));
}

describe("WeekBoard", () => {
  test("renders seven day columns, Monday through Sunday", () => {
    render(<WeekBoard days={makeDays()} />);

    const labels = [
      "Mon 12",
      "Tue 13",
      "Wed 14",
      "Thu 15",
      "Fri 16",
      "Sat 17",
      "Sun 18",
    ];

    for (const label of labels) {
      expect(
        screen.getByRole("columnheader", { name: new RegExp(label) }),
      ).toBeInTheDocument();
    }
  });

  test("marks today's column and leaves the others unmarked", () => {
    render(<WeekBoard days={makeDays()} />);

    expect(screen.getByText("Wed 14").closest("th")).toHaveAttribute(
      "data-today",
      "true",
    );
    expect(screen.getByText("Mon 12").closest("th")).not.toHaveAttribute(
      "data-today",
    );
  });

  test("renders every Goal slot once as a row header, in dining order", () => {
    render(<WeekBoard days={makeDays()} />);

    const rowHeaders = screen.getAllByRole("rowheader");

    expect(rowHeaders).toHaveLength(slotNames.length);
    expect(rowHeaders[0]).toHaveTextContent("Breakfast");
    expect(rowHeaders[1]).toHaveTextContent("Lunch");
    expect(rowHeaders[2]).toHaveTextContent("Dinner");
  });

  test("formats day and slot targets through formatMacro", () => {
    render(<WeekBoard days={makeDays()} />);

    // The day line repeats once per column.
    expect(screen.getAllByText("0 / 2200 kcal")).toHaveLength(7);
    expect(screen.getAllByText("P 0/156 · C 0/200 · F 0/70")).toHaveLength(7);

    // The first slot's decimal survives, and only appears on its row header.
    expect(
      screen.getByText(/660 kcal · P 46\.8 g · C 60 g · F 21 g/),
    ).toBeInTheDocument();
  });

  test("shows an empty placeholder in every day × slot cell", () => {
    render(<WeekBoard days={makeDays()} />);

    expect(screen.getAllByText("Nothing planned")).toHaveLength(7 * 3);
  });

  test("falls back to a placeholder when a day has no budget", () => {
    const days = makeDays().map((day) => ({ ...day, budget: null }));

    render(<WeekBoard days={days} />);

    expect(screen.getAllByText("No target set")).toHaveLength(7);
  });
});
