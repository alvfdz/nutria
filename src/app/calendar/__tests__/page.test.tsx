import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import CalendarPage from "@/app/calendar/page";
import {
  addDays,
  dbDateFromKey,
  formatWeekRange,
  startOfWeek,
  todayKey,
} from "@/lib/calendar/week";
import { getGoals } from "@/lib/goals/repository";
import type { Goals } from "@/lib/goals/types";
import type { Meal } from "@/lib/meals/types";
import { listMeals } from "@/lib/meals/repository";
import { getPlansForRange } from "@/lib/plan/repository";
import type { PlannedMeal } from "@/lib/plan/types";
import { makeGoals, makeMeal, makePlannedMeal } from "@test/factories";

vi.mock("@/lib/goals/repository", () => ({ getGoals: vi.fn() }));
vi.mock("@/lib/meals/repository", () => ({ listMeals: vi.fn() }));
vi.mock("@/lib/plan/repository", () => ({ getPlansForRange: vi.fn() }));
vi.mock("@/app/calendar/actions", () => ({
  assignMealAction: vi.fn(),
  removeMealAction: vi.fn(),
}));

beforeEach(() => {
  // Pin "today" to Wednesday 14 Oct 2026 in local time, so the current week is
  // Mon 12 → Sun 18 and Monday and Tuesday are read-only.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0, 0));
  vi.resetAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Renders the page with the given stored state resolved.
 *
 * @param options.week The raw `week` search parameter, if any.
 * @param options.meals The meal library to return.
 * @param options.plans The week's plan rows to return.
 * @param options.goals The goals to return, or null for a first visit.
 */
async function renderPage({
  week,
  meals = [],
  plans = [],
  goals = makeGoals(),
}: {
  week?: string;
  meals?: Meal[];
  plans?: PlannedMeal[];
  goals?: Goals | null;
} = {}) {
  vi.mocked(getGoals).mockResolvedValue(goals);
  vi.mocked(listMeals).mockResolvedValue(meals);
  vi.mocked(getPlansForRange).mockResolvedValue(plans);

  render(
    await CalendarPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(week ? { week } : {}),
    }),
  );
}

describe("CalendarPage", () => {
  test("renders the heading and the board with the Goals slots", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Calendar" }),
    ).toBeInTheDocument();

    const breakfast = screen.getAllByRole("region", { name: /^Breakfast on/ });
    expect(breakfast).toHaveLength(7);

    expect(
      screen.getByRole("region", { name: "Breakfast on 2026-10-14" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Lunch on 2026-10-14" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Dinner on 2026-10-14" }),
    ).toBeInTheDocument();
  });

  test("selects the requested week from the search param", async () => {
    await renderPage({ week: "2030-06-12" });

    expect(
      screen.getByText(formatWeekRange(startOfWeek("2030-06-12"))),
    ).toBeInTheDocument();
    expect(getPlansForRange).toHaveBeenCalledWith(
      dbDateFromKey(startOfWeek("2030-06-12")),
      dbDateFromKey(addDays(startOfWeek("2030-06-12"), 6)),
    );
  });

  test("clamps a past week to the current one", async () => {
    await renderPage({ week: "2020-01-08" });

    expect(
      screen.getByText(formatWeekRange(startOfWeek(todayKey()))),
    ).toBeInTheDocument();
  });

  test("shows a planned meal and hides its controls once the day has passed", async () => {
    const today = todayKey();
    const monday = startOfWeek(today);
    const porridge = makeMeal({ id: "meal-porridge", name: "Porridge" });
    const oldOats = makeMeal({ id: "meal-old", name: "Old oats" });
    const plans = [
      makePlannedMeal({
        id: "plan-today",
        date: today,
        mealSlotId: "meal-slot-1",
        mealId: porridge.id,
        meal: porridge,
      }),
      makePlannedMeal({
        id: "plan-past",
        date: monday,
        mealSlotId: "meal-slot-1",
        mealId: oldOats.id,
        meal: oldOats,
      }),
    ];

    await renderPage({ meals: [porridge, oldOats], plans });

    const todaySlot = screen.getByRole("region", {
      name: `Breakfast on ${today}`,
    });
    const pastSlot = screen.getByRole("region", {
      name: `Breakfast on ${monday}`,
    });

    expect(within(todaySlot).getByText("Porridge")).toBeInTheDocument();
    expect(
      within(todaySlot).getByRole("button", {
        name: "Remove Porridge from Breakfast",
      }),
    ).toBeInTheDocument();
    expect(
      within(todaySlot).getByRole("button", { name: /Add meal/ }),
    ).toBeInTheDocument();

    expect(within(pastSlot).getByText("Old oats")).toBeInTheDocument();
    expect(
      within(pastSlot).queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
    expect(
      within(pastSlot).queryByRole("button", { name: /Add meal/ }),
    ).not.toBeInTheDocument();
  });

  test("explains what to do, and hides the board, when there are no goals", async () => {
    await renderPage({ goals: null });

    expect(screen.getByText("Set your budget first")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Set your budget" }),
    ).toHaveAttribute("href", "/goals");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  test("loads the goals, library and week plan once", async () => {
    await renderPage();

    expect(getGoals).toHaveBeenCalledOnce();
    expect(listMeals).toHaveBeenCalledOnce();
    expect(getPlansForRange).toHaveBeenCalledOnce();
  });
});
