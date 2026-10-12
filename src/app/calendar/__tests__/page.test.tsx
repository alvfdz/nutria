import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import CalendarPage from "@/app/calendar/page";
import { formatWeekRange, startOfWeek, todayKey } from "@/lib/calendar/week";
import { getGoals } from "@/lib/goals/repository";
import type { Goals } from "@/lib/goals/types";
import { makeGoals } from "@test/factories";

vi.mock("@/lib/goals/repository", () => ({ getGoals: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
});

/**
 * Answers the goals repository, then resolves the page element to render for
 * the given `?week=` parameter.
 *
 * @param goals The goals to return, or null for a first visit.
 * @param week The raw `week` search parameter, if any.
 */
async function renderPage(goals: Goals | null, week?: string) {
  vi.mocked(getGoals).mockResolvedValue(goals);

  render(
    await CalendarPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(week ? { week } : {}),
    }),
  );
}

describe("CalendarPage", () => {
  test("renders the heading and the board with the Goals slots", async () => {
    await renderPage(makeGoals());

    expect(
      screen.getByRole("heading", { level: 1, name: "Calendar" }),
    ).toBeInTheDocument();

    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders).toHaveLength(3);
    expect(rowHeaders[0]).toHaveTextContent("Breakfast");
    expect(rowHeaders[1]).toHaveTextContent("Lunch");
    expect(rowHeaders[2]).toHaveTextContent("Dinner");
  });

  test("selects the requested week from the search param", async () => {
    await renderPage(makeGoals(), "2030-06-12");

    expect(
      screen.getByText(formatWeekRange(startOfWeek("2030-06-12"))),
    ).toBeInTheDocument();
  });

  test("clamps a past week to the current one", async () => {
    await renderPage(makeGoals(), "2020-01-08");

    expect(
      screen.getByText(formatWeekRange(startOfWeek(todayKey()))),
    ).toBeInTheDocument();
  });

  test("explains what to do, and hides the board, when there are no goals", async () => {
    await renderPage(null);

    expect(screen.getByText("Set your budget first")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Set your budget" }),
    ).toHaveAttribute("href", "/goals");
    expect(screen.queryByRole("rowheader")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /Mon/ }),
    ).not.toBeInTheDocument();
  });

  test("loads the goals once", async () => {
    await renderPage(makeGoals());

    expect(getGoals).toHaveBeenCalledOnce();
  });
});
